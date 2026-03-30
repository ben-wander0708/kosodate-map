"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { PostEnrollmentEvent, EventAssignee } from "@/lib/data/types";
import postEnrollmentData from "@/lib/data/post-enrollment-events.json";
import { useOnboarding } from "@/hooks/useOnboarding";

interface TimelineClientProps {
  municipalityName: string;
  municipalityId: string;
}

const LOCAL_SHARE_KEY = "kosodate_share_id";

function getShareIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("share");
}

function generateId(): string {
  return crypto.randomUUID();
}

/** 入園月文字列 ("2026-04") から offset 月後の "YYYY年M月" を返す */
function getMonthLabel(enrollmentMonth: string, offset: number): string {
  const [year, month] = enrollmentMonth.split("-").map(Number);
  const d = new Date(year, month - 1 + offset, 1);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** 入園月文字列 ("2026-04") から今日までの日数を返す（正=未来、0=今日、負=過去） */
function getDaysUntilEnrollment(enrollmentMonth: string | null): number | null {
  if (!enrollmentMonth) return null;
  const [y, m] = enrollmentMonth.split("-").map(Number);
  const target = new Date(y, m - 1, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Date を "YYYY-MM-DD" にローカルタイムで変換 */
function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 入園後イベントのデフォルト日付を "YYYY-MM-DD" で返す（その月の1日） */
function getEventDefaultDate(event: PostEnrollmentEvent, enrollmentMonth: string): string | null {
  if (!enrollmentMonth) return null;
  const [year, month] = enrollmentMonth.split("-").map(Number);
  const d = new Date(year, month - 1 + event.month_offset, 1);
  return toLocalDateStr(d);
}

/** .icsファイル（カレンダー読み込み用）の文字列を生成する */
function generateICS(calItems: { id: string; title: string; date: string }[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//こそだてマップ//kosodate-map//JA",
    "CALSCALE:GREGORIAN",
  ];
  for (const item of calItems) {
    const dateStr = item.date.replace(/-/g, "");
    const d = new Date(item.date);
    d.setDate(d.getDate() + 1);
    const endStr = toLocalDateStr(d).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@kosodate-map`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:${item.title}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** 保存された日付文字列（単日 or "start/end"）から表示ラベルを生成 */
function getDateLabel(val: string | undefined): string | null {
  if (!val) return null;
  if (val.includes("/")) {
    const [s, e] = val.split("/");
    const sd = new Date(s), ed = new Date(e);
    if (sd.getMonth() === ed.getMonth()) {
      return `${sd.getMonth()+1}月${sd.getDate()}〜${ed.getDate()}日`;
    }
    return `${sd.getMonth()+1}月${sd.getDate()}日〜${ed.getMonth()+1}月${ed.getDate()}日`;
  }
  const d = new Date(val);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}

/** YYYY-MM を delta ヶ月ずらした YYYY-MM を返す */
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  慣らし保育:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200" },
  "行事・発表": { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  "園との関わり":{ bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "書類・手続き":{ bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  "健康・緊急対応":{ bg: "bg-red-50", text: "text-red-700",    border: "border-red-200" },
  復職準備:     { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200" },
};

const CATEGORY_CHIPS: { label: string; icon: string; value: string | null }[] = [
  { label: "すべて",     icon: "",   value: null },
  { label: "慣らし保育", icon: "🌱", value: "慣らし保育" },
  { label: "行事・発表", icon: "🎪", value: "行事・発表" },
  { label: "園との関わり",icon:"🏫", value: "園との関わり" },
  { label: "書類・手続き",icon:"📋", value: "書類・手続き" },
  { label: "健康・緊急", icon: "🏥", value: "健康・緊急対応" },
  { label: "復職準備",   icon: "💼", value: "復職準備" },
];

const ASSIGNEE_OPTIONS: { value: EventAssignee; label: string; emoji: string }[] = [
  { value: "mother", label: "母",  emoji: "👩" },
  { value: "father", label: "父",  emoji: "👨" },
  { value: "both",   label: "二人", emoji: "👫" },
];

export default function TimelineClient({ municipalityName, municipalityId }: TimelineClientProps) {
  const onboarding = useOnboarding();

  const [shareId, setShareId] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [enrollmentMonth, setEnrollmentMonth] = useState<string>("");
  const [eventAssignees, setEventAssignees] = useState<Record<string, EventAssignee>>({});
  const [itemDates, setItemDates] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "calendar">("timeline");
  const [expandedDateId, setExpandedDateId] = useState<string | null>(null);
  const [expandedDateType, setExpandedDateType] = useState<"single" | "range">("single");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<string>("");
  const [milestoneMemos, setMilestoneMemos] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("milestone_memos") ?? "{}"); } catch { return {}; }
  });

  // Supabaseから読み込み
  const loadFromSupabase = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("checklist_sessions")
        .select("enrollment_month, event_assignees, item_dates")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        if (data.enrollment_month) setEnrollmentMonth(data.enrollment_month);
        if (data.event_assignees) setEventAssignees(data.event_assignees as Record<string, EventAssignee>);
        if (data.item_dates) setItemDates(data.item_dates as Record<string, string>);
      }
    } catch {
      // サイレントに失敗
    }
  }, []);

  // Supabaseに保存
  const saveToSupabase = useCallback(async (
    id: string,
    updates: {
      enrollment_month?: string;
      event_assignees?: Record<string, EventAssignee>;
      item_dates?: Record<string, string>;
    }
  ) => {
    try {
      const supabase = getSupabase();
      await supabase.from("checklist_sessions").upsert({
        id,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // サイレントに失敗
    }
  }, []);

  useEffect(() => {
    const urlShareId = getShareIdFromUrl();
    if (urlShareId) {
      setShareId(urlShareId);
      setIsShared(true);
      loadFromSupabase(urlShareId).then(() => setLoaded(true));
    } else {
      let id = localStorage.getItem(LOCAL_SHARE_KEY);
      if (!id) {
        id = generateId();
        localStorage.setItem(LOCAL_SHARE_KEY, id);
      }
      setShareId(id);
      setIsShared(false);
      loadFromSupabase(id).then(() => {
        try {
          const savedEnrollment = localStorage.getItem("kosodate_enrollment_month");
          if (savedEnrollment) setEnrollmentMonth((prev) => prev || savedEnrollment);
        } catch {}
        setLoaded(true);
      });
    }
  }, [loadFromSupabase]);

  // オンボーディングの中央データから入園月を自動反映
  useEffect(() => {
    if (!onboarding.isLoaded) return;
    if (onboarding.enrollmentMonth) {
      setEnrollmentMonth((prev) => prev || onboarding.enrollmentMonth!);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding.isLoaded]);

  const handleEnrollmentMonthChange = useCallback((value: string) => {
    setEnrollmentMonth(value);
    onboarding.updateAnswers({ enrollment_month: value });
    if (shareId) saveToSupabase(shareId, { enrollment_month: value });
  }, [shareId, saveToSupabase, onboarding]);

  const handleAssigneeChange = useCallback((eventId: string, assignee: EventAssignee) => {
    setEventAssignees((prev) => {
      const next = { ...prev };
      if (next[eventId] === assignee) {
        delete next[eventId];
      } else {
        next[eventId] = assignee;
      }
      if (shareId) saveToSupabase(shareId, { event_assignees: next });
      return next;
    });
  }, [shareId, saveToSupabase]);

  const handleItemDateChange = useCallback((itemId: string, date: string) => {
    setItemDates((prev) => {
      const next = { ...prev };
      if (date) { next[itemId] = date; } else { delete next[itemId]; }
      if (shareId) saveToSupabase(shareId, { item_dates: next });
      return next;
    });
  }, [shareId, saveToSupabase]);

  const handleShare = useCallback(async () => {
    if (!shareId) return;
    await saveToSupabase(shareId, {
      enrollment_month: enrollmentMonth,
      event_assignees: eventAssignees,
      item_dates: itemDates,
    });
    const url = `${window.location.origin}/${municipalityId}/timeline?share=${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      prompt("このURLをパートナーに送ってください:", url);
    }
  }, [shareId, saveToSupabase, enrollmentMonth, eventAssignees, itemDates, municipalityId]);

  // タイムラインイベント
  const timelineEvents = (postEnrollmentData.events as PostEnrollmentEvent[]).filter((e) => {
    if (e.for_leave_only && !onboarding.isOnLeave) return false;
    return true;
  });

  // 夫ビュー用
  const fatherTasks = timelineEvents.filter((e) => eventAssignees[e.id] === "father");
  const unassignedTasks = timelineEvents.filter((e) => !eventAssignees[e.id]);

  // month_offset でグルーピング
  const eventsByOffset = timelineEvents.reduce<Record<number, PostEnrollmentEvent[]>>((acc, e) => {
    if (!acc[e.month_offset]) acc[e.month_offset] = [];
    acc[e.month_offset].push(e);
    return acc;
  }, {});
  const sortedOffsets = Object.keys(eventsByOffset).map(Number).sort((a, b) => a - b);

  if (!loaded) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* ヘッダーバナー */}
      <div className="bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52] rounded-xl p-4 text-white">
        <div>
          <h2 className="text-base font-bold mb-1">入園後タイムライン</h2>
          <p className="text-xs text-green-200">
            {municipalityName}の入園後イベントを夫婦で共有・担当を決めましょう。
          </p>
        </div>
        {isShared ? (
          <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 text-xs text-green-100">
            👥 パートナーから共有されたリストです
          </div>
        ) : (
          <button
            onClick={handleShare}
            className="mt-3 w-full bg-white/20 hover:bg-white/30 rounded-lg px-3 py-3 text-xs text-white font-semibold flex items-center justify-center gap-2 transition-all min-h-[44px]"
          >
            {isCopied ? "✅ URLをコピーしました！" : "👫 パートナーと共有する"}
          </button>
        )}
      </div>

      {/* ===== パパダッシュボード（共有URLでアクセス時のみ） ===== */}
      {isShared && (
        <div className="space-y-3">
          {fatherTasks.length > 0 && (
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                <span className="text-base">👨</span>
                <p className="text-sm font-bold text-blue-700">パパのタスク（{fatherTasks.length}件）</p>
              </div>
              <div className="divide-y divide-gray-100">
                {fatherTasks.map((event) => (
                  <div key={event.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                      {enrollmentMonth && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{getMonthLabel(enrollmentMonth, event.month_offset)}</p>
                      )}
                    </div>
                    <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0 font-semibold">パパ ✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unassignedTasks.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="bg-amber-50 px-4 py-2.5 flex items-center gap-2">
                <span className="text-base">📋</span>
                <p className="text-sm font-bold text-amber-700">まだ誰も担当していない（{unassignedTasks.length}件）</p>
              </div>
              <div className="divide-y divide-gray-100">
                {unassignedTasks.map((event) => (
                  <div key={event.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                      {enrollmentMonth && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{getMonthLabel(enrollmentMonth, event.month_offset)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAssigneeChange(event.id, "father")}
                      className="flex-shrink-0 text-xs font-semibold bg-[#2d9e6b] text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    >
                      引き受ける
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fatherTasks.length === 0 && unassignedTasks.length === 0 && (
            <div className="bg-green-50 rounded-xl border border-green-100 px-4 py-4 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm font-bold text-green-700">全タスクの担当が決まっています</p>
            </div>
          )}
        </div>
      )}

      {/* タブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 py-3 text-xs font-semibold rounded-lg transition-all min-h-[44px] ${
            activeTab === "timeline" ? "bg-white text-[#2d9e6b] shadow-sm" : "text-gray-500"
          }`}
        >
          📋 タイムライン
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 py-3 text-xs font-semibold rounded-lg transition-all min-h-[44px] ${
            activeTab === "calendar" ? "bg-white text-[#2d9e6b] shadow-sm" : "text-gray-500"
          }`}
        >
          🗓 カレンダー
        </button>
      </div>

      {/* ===== 入園後タイムライン ===== */}
      {activeTab === "timeline" && (
        <>
          {/* 入園月入力 */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 mb-1">🏫 保育園の入園月</p>
            <input
              type="month"
              value={enrollmentMonth}
              onChange={(e) => handleEnrollmentMonthChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#4CAF82]"
            />
            {enrollmentMonth ? (
              <p className="text-xs text-[#2d9e6b] mt-1 font-medium">
                ✅ {enrollmentMonth.replace("-", "年")}月入園のスケジュールを表示中
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                入園月を入力すると、各イベントの実際の月が表示されます
              </p>
            )}
          </div>

          {!isShared && (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                👫 <span className="font-semibold">担当者を設定してパートナーと共有</span>しましょう。
                「パートナーと共有する」ボタンでURLを送れば、二人が同じ画面を見られます。
              </p>
            </div>
          )}

          {/* カテゴリフィルター */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
              {CATEGORY_CHIPS.map((chip) => {
                const isActive = selectedCategory === chip.value;
                return (
                  <button
                    key={chip.label}
                    onClick={() => setSelectedCategory(chip.value)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                      isActive
                        ? "bg-[#2d9e6b] text-white border-[#2d9e6b]"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {chip.icon && <span>{chip.icon}</span>}
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* タイムライン本体 */}
          <div className="space-y-4">
            {sortedOffsets.map((offset) => {
              const events = eventsByOffset[offset].filter(
                (e) => !selectedCategory || e.category === selectedCategory
              );
              if (events.length === 0) return null;
              const monthLabel = enrollmentMonth
                ? getMonthLabel(enrollmentMonth, offset)
                : `入園${offset === 0 ? "月" : `から${offset}ヶ月後`}`;

              return (
                <div key={offset}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#2d9e6b]" />
                    <h3 className="text-sm font-bold text-gray-700">{monthLabel}</h3>
                  </div>

                  <div className="space-y-2 ml-4 border-l-2 border-gray-100 pl-3">
                    {events.map((event) => {
                      const colors = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS["書類・手続き"];
                      const assignee = eventAssignees[event.id] ?? null;

                      // --- マイルストーンカード ---
                      if (event.is_milestone) {
                        const daysLeft = getDaysUntilEnrollment(enrollmentMonth || null);
                        return (
                          <div key={event.id} className="rounded-2xl overflow-hidden shadow-md border border-pink-200 bg-white">
                            <div className="bg-gradient-to-r from-pink-100 to-rose-50 px-4 py-5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-2xl">🌸</span>
                                  <h3 className="text-lg font-bold text-rose-700 mt-1">{event.title}</h3>
                                  {enrollmentMonth && (
                                    <p className="text-sm text-rose-400 mt-0.5">{getMonthLabel(enrollmentMonth, 0)}</p>
                                  )}
                                </div>
                                {daysLeft !== null && (
                                  <div className="text-right flex-shrink-0">
                                    {daysLeft > 0 ? (
                                      <p className="text-3xl font-bold text-rose-600 leading-none">あと{daysLeft}日</p>
                                    ) : daysLeft === 0 ? (
                                      <p className="text-xl font-bold text-rose-600">今日！🎉</p>
                                    ) : (
                                      <p className="text-sm text-gray-400">入園済み</p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 flex gap-2 flex-wrap">
                                {ASSIGNEE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleAssigneeChange(event.id, opt.value)}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
                                      assignee === opt.value
                                        ? "bg-rose-500 text-white"
                                        : "bg-white text-gray-500 border border-gray-200"
                                    }`}
                                  >
                                    {opt.emoji} {opt.label}{assignee === opt.value ? " ✓" : ""}
                                  </button>
                                ))}
                                {assignee && (
                                  <button
                                    onClick={() => handleAssigneeChange(event.id, assignee)}
                                    className="text-xs text-rose-400 underline self-center py-2 px-1"
                                  >
                                    解除
                                  </button>
                                )}
                              </div>
                            </div>
                            {event.note && (
                              <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                                <p className="text-xs text-amber-700">📝 {event.note}</p>
                              </div>
                            )}
                            {onboarding.isMultiChild && event.multi_child_note && (
                              <div className="px-4 py-2 bg-orange-50 border-t border-orange-100">
                                <p className="text-xs text-orange-700">👶👶 {event.multi_child_note}</p>
                              </div>
                            )}
                            <div className="px-4 py-3 border-t border-gray-100">
                              <p className="text-xs text-gray-400 mb-1.5">想い出メモ</p>
                              <textarea
                                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:border-rose-300"
                                rows={2}
                                placeholder="この日の記録を残しておこう…"
                                value={milestoneMemos[event.id] ?? ""}
                                onChange={(e) => {
                                  const updated = { ...milestoneMemos, [event.id]: e.target.value };
                                  setMilestoneMemos(updated);
                                  localStorage.setItem("milestone_memos", JSON.stringify(updated));
                                }}
                              />
                            </div>
                          </div>
                        );
                      }

                      // --- 通常カード ---
                      return (
                        <div key={event.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${colors.bg} ${colors.text}`}>
                              {event.category}
                            </span>
                            <p className="text-sm font-semibold text-gray-800 leading-tight">{event.title}</p>
                          </div>
                          {event.note && (
                            <p className="text-[11px] text-gray-400 mb-2 leading-relaxed pl-1">{event.note}</p>
                          )}
                          {onboarding.isMultiChild && event.multi_child_note && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
                              <p className="text-[11px] text-amber-700 leading-relaxed">👶👶 {event.multi_child_note}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-gray-400 mr-1">担当：</span>
                            {ASSIGNEE_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => handleAssigneeChange(event.id, opt.value)}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-semibold border transition-all min-h-[36px] ${
                                  assignee === opt.value
                                    ? "bg-[#2d9e6b] text-white border-[#2d9e6b]"
                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                }`}
                              >
                                {opt.emoji} {opt.label}
                              </button>
                            ))}
                            {assignee && (
                              <button
                                onClick={() => handleAssigneeChange(event.id, assignee)}
                                className="text-[11px] text-gray-400 underline ml-1 py-2 px-1 min-h-[36px]"
                              >
                                解除
                              </button>
                            )}
                          </div>

                          {/* 日付設定（任意） */}
                          {(() => {
                            const val = itemDates[event.id];
                            const isExpanded = expandedDateId === event.id;
                            const label = getDateLabel(val);
                            const defaultDate = enrollmentMonth ? getEventDefaultDate(event, enrollmentMonth) : null;
                            const rangeStart = val?.includes("/") ? val.split("/")[0] : (val || "");
                            const rangeEnd   = val?.includes("/") ? val.split("/")[1] : "";
                            return (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                {isExpanded ? (
                                  <div className="space-y-2">
                                    {/* 単日/期間 トグル */}
                                    <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                                      <button
                                        onClick={() => setExpandedDateType("single")}
                                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${expandedDateType === "single" ? "bg-white text-[#2d9e6b] shadow-sm" : "text-gray-400"}`}
                                      >単日</button>
                                      <button
                                        onClick={() => setExpandedDateType("range")}
                                        className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${expandedDateType === "range" ? "bg-white text-[#2d9e6b] shadow-sm" : "text-gray-400"}`}
                                      >期間</button>
                                    </div>

                                    {expandedDateType === "single" ? (
                                      <input
                                        type="date"
                                        value={rangeStart || defaultDate || ""}
                                        onChange={(e) => { handleItemDateChange(event.id, e.target.value); setExpandedDateId(null); }}
                                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#4CAF82]"
                                        autoFocus
                                      />
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="date"
                                          value={rangeStart || defaultDate || ""}
                                          onChange={(e) => {
                                            const end = rangeEnd || e.target.value;
                                            handleItemDateChange(event.id, `${e.target.value}/${end}`);
                                          }}
                                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#4CAF82]"
                                          autoFocus
                                        />
                                        <span className="text-[10px] text-gray-400 flex-shrink-0">〜</span>
                                        <input
                                          type="date"
                                          value={rangeEnd || rangeStart || ""}
                                          onChange={(e) => {
                                            const start = rangeStart || e.target.value;
                                            handleItemDateChange(event.id, `${start}/${e.target.value}`);
                                          }}
                                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#4CAF82]"
                                        />
                                      </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                      {val && (
                                        <button onClick={() => { handleItemDateChange(event.id, ""); setExpandedDateId(null); }} className="text-[10px] text-gray-400 underline">クリア</button>
                                      )}
                                      <button onClick={() => setExpandedDateId(null)} className="text-[10px] text-gray-400">閉じる</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setExpandedDateType(val?.includes("/") ? "range" : "single");
                                      setExpandedDateId(event.id);
                                    }}
                                    className={`text-[11px] transition-colors py-1.5 px-1 min-h-[32px] ${label ? "text-[#2d9e6b] font-semibold" : "text-gray-400 hover:text-gray-600"}`}
                                  >
                                    {label ? `📅 ${label}` : "📅 日付を設定（任意）"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===== カレンダービュー（月別グリッド） ===== */}
      {activeTab === "calendar" && (() => {
        const now = new Date();
        const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const displayMonth = calendarMonth || enrollmentMonth || currentYM;
        const [cy, cm] = displayMonth.split("-").map(Number);

        // 週グリッドを生成（日曜始まり）
        const firstDow = new Date(cy, cm - 1, 1).getDay();
        const daysInMonth = new Date(cy, cm, 0).getDate();
        const weeks: (number | null)[][] = [];
        let week: (number | null)[] = Array(firstDow).fill(null);
        for (let d = 1; d <= daysInMonth; d++) {
          week.push(d);
          if (week.length === 7) { weeks.push(week); week = []; }
        }
        if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)]);

        // 各日にどのイベントが該当するかを収集
        type DayEvent = { event: PostEnrollmentEvent; isRange: boolean };
        const eventsByDay: Record<number, DayEvent[]> = {};
        const addToDay = (day: number, event: PostEnrollmentEvent, isRange: boolean) => {
          if (!eventsByDay[day]) eventsByDay[day] = [];
          eventsByDay[day].push({ event, isRange });
        };
        timelineEvents.forEach((event) => {
          const val = itemDates[event.id];
          if (!val) return;
          if (val.includes("/")) {
            const [startStr, endStr] = val.split("/");
            const cur = new Date(startStr);
            const end = new Date(endStr);
            while (cur <= end) {
              if (cur.getFullYear() === cy && cur.getMonth() === cm - 1) addToDay(cur.getDate(), event, true);
              cur.setDate(cur.getDate() + 1);
            }
          } else {
            const d = new Date(val);
            if (d.getFullYear() === cy && d.getMonth() === cm - 1) addToDay(d.getDate(), event, false);
          }
        });

        // ICSエクスポート
        const handleExport = () => {
          const items = timelineEvents
            .filter((e) => itemDates[e.id])
            .map((e) => {
              const val = itemDates[e.id];
              if (val.includes("/")) {
                const [startDate, endDate] = val.split("/");
                return { id: e.id, title: e.title, date: startDate, endDate };
              }
              return { id: e.id, title: e.title, date: val };
            });
          if (items.length === 0) { alert("日付が設定されたタスクがありません。"); return; }
          const ics = generateICS(items);
          const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "kosodate-schedule.ics"; a.click();
          URL.revokeObjectURL(url);
        };

        const hasAnyDates = timelineEvents.some((e) => itemDates[e.id]);

        return (
          <div className="space-y-4">
            {/* カレンダー本体 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* 月ナビゲーション */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <button
                  onClick={() => setCalendarMonth(shiftMonth(displayMonth, -1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl leading-none"
                >‹</button>
                <span className="text-sm font-bold text-gray-800">{cy}年{cm}月</span>
                <button
                  onClick={() => setCalendarMonth(shiftMonth(displayMonth, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl leading-none"
                >›</button>
              </div>

              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {["日","月","火","水","木","金","土"].map((label, i) => (
                  <div key={label} className={`py-2 text-center text-[11px] font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>
                    {label}
                  </div>
                ))}
              </div>

              {/* 日付グリッド */}
              <div>
                {weeks.map((wk, wi) => (
                  <div key={wi} className="grid grid-cols-7 border-b border-gray-50 last:border-0">
                    {wk.map((day, di) => {
                      if (!day) return <div key={di} className="min-h-[52px] bg-gray-50/50" />;
                      const dayEvents = eventsByDay[day] ?? [];
                      const isToday = now.getFullYear() === cy && now.getMonth() === cm - 1 && now.getDate() === day;
                      return (
                        <div key={di} className={`min-h-[52px] p-0.5 border-l border-gray-50 first:border-0 ${di === 0 ? "bg-red-50/20" : di === 6 ? "bg-blue-50/20" : ""}`}>
                          {/* 日付番号 */}
                          <div className="flex justify-center mb-0.5">
                            <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                              isToday ? "bg-[#2d9e6b] text-white" :
                              di === 0 ? "text-red-400" : di === 6 ? "text-blue-400" : "text-gray-600"
                            }`}>{day}</span>
                          </div>
                          {/* イベントチップ */}
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 2).map(({ event, isRange }, idx) => {
                              const colors = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS["書類・手続き"];
                              return (
                                <div key={idx} className={`text-[10px] font-medium px-0.5 py-0.5 rounded leading-tight truncate ${colors.bg} ${colors.text}`}>
                                  {isRange && <span className="mr-0.5">↔</span>}{event.title}
                                </div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <div className="text-[10px] text-gray-400 text-center">+{dayEvents.length - 2}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* エクスポートボタン */}
            {hasAnyDates ? (
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-2">
                <p className="text-xs text-gray-400 leading-relaxed">設定した日付をカレンダーアプリに一括追加できます。</p>
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 bg-[#4CAF82] text-white rounded-xl py-3 text-sm font-semibold"
                >
                  📅 Googleカレンダーに追加（.ics）
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-5 text-center">
                <p className="text-xl mb-1">📅</p>
                <p className="text-sm text-gray-500 font-semibold mb-1">まだ日付が設定されていません</p>
                <p className="text-xs text-gray-400">「入園後」タブの各イベントで日付を設定するとここに表示されます</p>
              </div>
            )}
          </div>
        );
      })()}

      <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700 border border-yellow-200">
        <p className="font-semibold mb-1">⚠ ご注意</p>
        <ul className="space-y-1 text-yellow-600">
          <li>・ イベントの内容・時期は保育園によって異なります。</li>
          <li>・ 担当者の設定はクラウドに保存され共有URLで同期されます。</li>
        </ul>
      </div>
    </div>
  );
}

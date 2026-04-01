"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import type { MunicipalityChecklist, ChecklistItem } from "@/lib/data/types";
import { useOnboarding } from "@/hooks/useOnboarding";

interface ChecklistClientProps {
  checklist: MunicipalityChecklist;
  municipalityName: string;
  municipalityId: string;
}

const LOCAL_SHARE_KEY = "kosodate_share_id";

// 保育園の入所申込みを示すアイテムID（チェック済み → 待機ダッシュボードを表示）
const APPLICATION_ITEM_IDS = new Set([
  "di-u-4-april", "di-u-4-midyear",
  "sp-a-3-april", "sp-a-3-midyear",
]);

function generateId(): string {
  return crypto.randomUUID();
}

function getEmploymentCertReminder(enrollmentMonth: string, hasApplied: boolean) {
  if (!enrollmentMonth || hasApplied) return null;

  const [yearStr, monthStr] = enrollmentMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  // 締め切り日を算出：4月入所は前年11月28日、途中入所は入所希望月の前月1日
  let deadlineDate: Date;
  if (month === 4) {
    deadlineDate = new Date(year - 1, 10, 28); // 0-indexed month
  } else {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    deadlineDate = new Date(prevYear, prevMonth - 1, 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  const daysUntilDeadline = Math.ceil(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 42日前（約6週間）から表示。締め切り7日後に非表示
  if (daysUntilDeadline > 42 || daysUntilDeadline < -7) return null;

  return {
    daysUntilDeadline,
    deadlineStr: `${deadlineDate.getMonth() + 1}月${deadlineDate.getDate()}日`,
  };
}

function getDaysLeft(movingDate: Date, daysFromMoving: number): number {
  const deadline = new Date(movingDate);
  deadline.setDate(deadline.getDate() + daysFromMoving);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineDate(movingDate: Date, daysFromMoving: number): string {
  const deadline = new Date(movingDate);
  deadline.setDate(deadline.getDate() + daysFromMoving);
  return `${deadline.getMonth() + 1}月${deadline.getDate()}日まで`;
}

export default function ChecklistClient({ checklist, municipalityName, municipalityId }: ChecklistClientProps) {
  const onboarding = useOnboarding();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isKioskMode = searchParams.get("mode") === "kiosk";
  const kioskUrl = `${pathname}?mode=kiosk`;

  const [shareId, setShareId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [movingDateStr, setMovingDateStr] = useState<string>("");
  const [enrollmentMonth, setEnrollmentMonth] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  const loadFromSupabase = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("checklist_sessions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        if (data.persona_id) setSelectedPersonaId(data.persona_id);
        if (data.checked_items) setCheckedItems(new Set(data.checked_items as string[]));
        if (data.moving_date) setMovingDateStr(data.moving_date);
        if (data.enrollment_month) setEnrollmentMonth(data.enrollment_month);
      }
    } catch {
      // Supabase失敗時はlocalStorageにフォールバック
    }
  }, []);

  const saveToSupabase = useCallback(async (
    id: string,
    updates: {
      persona_id?: string | null;
      checked_items?: string[];
      moving_date?: string;
      enrollment_month?: string;
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
    let id = localStorage.getItem(LOCAL_SHARE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(LOCAL_SHARE_KEY, id);
    }
    setShareId(id);

    loadFromSupabase(id).then(() => {
      try {
        const savedPersona    = localStorage.getItem("kosodate_checklist_persona");
        const savedChecked    = localStorage.getItem("kosodate_checklist_checked");
        const savedDate       = localStorage.getItem("kosodate_moving_date");
        const savedEnrollment = localStorage.getItem("kosodate_enrollment_month");
        if (savedPersona)    setSelectedPersonaId((prev) => prev ?? savedPersona);
        if (savedChecked)    setCheckedItems((prev) => prev.size > 0 ? prev : new Set(JSON.parse(savedChecked)));
        if (savedDate)       setMovingDateStr((prev) => prev || savedDate);
        if (savedEnrollment) setEnrollmentMonth((prev) => prev || savedEnrollment);
      } catch {}
      setLoaded(true);
    });
  }, [loadFromSupabase]);

  // オンボーディングの中央データから各値を自動反映（未設定の場合のみ）
  useEffect(() => {
    if (!onboarding.isLoaded) return;
    if (onboarding.suggestedPersonaId) {
      setSelectedPersonaId((prev) => prev ?? onboarding.suggestedPersonaId);
    }
    if (onboarding.enrollmentMonth) {
      setEnrollmentMonth((prev) => prev || onboarding.enrollmentMonth!);
    }
    if (onboarding.movingDate) {
      setMovingDateStr((prev) => prev || onboarding.movingDate!);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding.isLoaded]);

  const handlePersonaSelect = useCallback((personaId: string) => {
    setSelectedPersonaId(personaId);
    try { localStorage.setItem("kosodate_checklist_persona", personaId); } catch {}
    if (shareId) saveToSupabase(shareId, { persona_id: personaId });
  }, [shareId, saveToSupabase]);

  const handleToggle = useCallback((itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) { next.delete(itemId); } else { next.add(itemId); }
      try { localStorage.setItem("kosodate_checklist_checked", JSON.stringify([...next])); } catch {}
      if (shareId) saveToSupabase(shareId, { checked_items: [...next] });
      return next;
    });
  }, [shareId, saveToSupabase]);

  const handleMovingDateChange = useCallback((value: string) => {
    setMovingDateStr(value);
    onboarding.updateAnswers({ moving_date: value });
    if (shareId) saveToSupabase(shareId, { moving_date: value });
  }, [shareId, saveToSupabase, onboarding]);

  const handleEnrollmentMonthChange = useCallback((value: string) => {
    setEnrollmentMonth(value);
    onboarding.updateAnswers({ enrollment_month: value });
    if (shareId) saveToSupabase(shareId, { enrollment_month: value });
  }, [shareId, saveToSupabase, onboarding]);

  const handleReset = useCallback(() => {
    if (!window.confirm("チェックをすべてリセットしますか？")) return;
    setCheckedItems(new Set());
    try { localStorage.removeItem("kosodate_checklist_checked"); } catch {}
    if (shareId) saveToSupabase(shareId, { checked_items: [] });
  }, [shareId, saveToSupabase]);

  const handleShare = useCallback(async () => {
    if (!shareId) return;
    await saveToSupabase(shareId, {
      persona_id: selectedPersonaId,
      checked_items: [...checkedItems],
      moving_date: movingDateStr,
      enrollment_month: enrollmentMonth,
    });
    const url = `${window.location.origin}/${municipalityId}/timeline?share=${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      prompt("このURLをパートナーに送ってください:", url);
    }
  }, [shareId, saveToSupabase, selectedPersonaId, checkedItems, movingDateStr, enrollmentMonth, municipalityId]);

  const movingDate   = movingDateStr   ? new Date(movingDateStr)   : null;
  const selectedPersona = checklist.personas.find((p) => p.id === selectedPersonaId);
  const totalItems = selectedPersona
    ? selectedPersona.sections.reduce((sum, s) => sum + s.items.length, 0) : 0;
  const doneItems = selectedPersona
    ? selectedPersona.sections.flatMap((s) => s.items).filter((item) => checkedItems.has(item.id)).length : 0;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const hasApplied = [...APPLICATION_ITEM_IDS].some((id) => checkedItems.has(id));

  if (!loaded) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <>
    {/* 窓口提示モード：固定上部バー */}
    {isKioskMode && (
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#2d9e6b] text-white px-4 py-3 flex items-center justify-between shadow-md no-print">
        <div className="flex items-center gap-2">
          <span className="text-base">🖥</span>
          <span className="text-sm font-bold">窓口提示モード</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="text-xs bg-white/20 rounded-lg px-3 py-1.5 font-medium"
          >
            🖨 印刷
          </button>
          <a
            href={pathname}
            className="text-xs bg-white/20 rounded-lg px-3 py-1.5 font-medium"
          >
            ✕ 終了
          </a>
        </div>
      </div>
    )}

    {progress === 100 && (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white border-t border-[#c8ead8] shadow-lg">
        <Link
          href={`/${municipalityId}/timeline`}
          className="flex items-center justify-center gap-2 w-full bg-[#2d9e6b] text-white text-sm font-bold py-3 rounded-xl"
        >
          🌱 入園後タイムラインへ進む →
        </Link>
      </div>
    )}
    <div className={`space-y-4 p-4${progress === 100 ? " pb-20" : ""}${isKioskMode ? " kiosk-mode pt-20" : ""}`}>
      {/* ヘッダーバナー */}
      <div className="bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52] rounded-xl p-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold mb-1">転入チェックリスト</h2>
            <p className="text-xs text-green-200">
              {municipalityName}に転入したらやること。転入日を入力するとカウントダウン表示されます。
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleShare}
            className="flex-1 bg-white/20 hover:bg-white/30 rounded-lg px-3 py-3 text-xs text-white font-semibold flex items-center justify-center gap-2 transition-all min-h-[44px]"
          >
            {isCopied ? "✅ URLをコピーしました！" : "👫 パートナーと共有する"}
          </button>
          {!isKioskMode && (
            <a
              href={kioskUrl}
              className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-3 text-xs text-white font-semibold flex items-center justify-center gap-1 transition-all min-h-[44px] whitespace-nowrap no-print"
            >
              🖥 窓口で開く
            </a>
          )}
        </div>
      </div>

      {/* 転居済みユーザーへの入園月設定促進バナー */}
      {onboarding.answers?.phase === "moved" && !enrollmentMonth && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
          <span className="text-base flex-shrink-0">💡</span>
          <p className="text-xs text-blue-700 leading-relaxed">
            転居済みの方は<span className="font-bold">「保育園の入園月」</span>を設定すると、申込み後の審査待ちカウントダウンと就労証明書リマインダーが表示されます。
          </p>
        </div>
      )}

      {/* 日付入力 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">📅 引越し予定日</p>
          <input
            type="date"
            value={movingDateStr}
            onChange={(e) => handleMovingDateChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#4CAF82]"
          />
          {movingDate && (
            <p className="text-xs text-[#2d9e6b] mt-1 font-medium">
              ✅ {movingDate.getMonth() + 1}月{movingDate.getDate()}日から転入後の期限を計算中
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">🏫 保育園の入園月</p>
          <input
            type="month"
            value={enrollmentMonth}
            onChange={(e) => handleEnrollmentMonthChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#4CAF82]"
          />
        </div>
      </div>

      {/* 就労証明書リマインダー */}
      {(() => {
        const reminder = getEmploymentCertReminder(enrollmentMonth, hasApplied);
        if (!reminder) return null;
        const { daysUntilDeadline, deadlineStr } = reminder;
        const isPast    = daysUntilDeadline < 0;
        const isUrgent  = !isPast && daysUntilDeadline <= 7;
        const isWarning = !isPast && daysUntilDeadline <= 14;

        const bgBorder = isPast    ? "bg-gray-50 border-gray-200"
                       : isUrgent  ? "bg-red-50 border-red-200"
                       : isWarning ? "bg-orange-50 border-orange-200"
                       : "bg-yellow-50 border-yellow-200";
        const titleColor = isPast    ? "text-gray-600"
                         : isUrgent  ? "text-red-700"
                         : isWarning ? "text-orange-700"
                         : "text-yellow-700";
        const subColor = isPast    ? "text-gray-500"
                       : isUrgent  ? "text-red-600"
                       : isWarning ? "text-orange-600"
                       : "text-yellow-600";

        return (
          <div className={`rounded-xl p-4 border ${bgBorder}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{isPast ? "⚠️" : "📋"}</span>
              <div>
                <p className={`text-sm font-bold ${titleColor}`}>
                  {isPast ? "就労証明書の提出期限が過ぎています" : "就労証明書の準備を始めましょう"}
                </p>
                <p className={`text-xs mt-0.5 ${subColor}`}>
                  {isPast
                    ? `申込み締め切り（${deadlineStr}）が${Math.abs(daysUntilDeadline)}日前に過ぎました`
                    : `申込み締め切りまで約${daysUntilDeadline}日（${deadlineStr}）`}
                </p>
                {!isPast && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    💡 発行まで1〜2週間かかることがあります。早めに職場へ依頼を。
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ペルソナ選択 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">あなたの家族構成は？</p>
        <div className="grid grid-cols-3 gap-2">
          {checklist.personas.map((persona) => {
            const isSelected = selectedPersonaId === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => handlePersonaSelect(persona.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                  isSelected ? "border-[#2d9e6b] bg-[#f0faf5] shadow-sm" : "border-gray-200 bg-white"
                }`}
              >
                <span className="text-2xl">{persona.icon}</span>
                <span className={`text-xs font-semibold leading-tight ${isSelected ? "text-[#2d9e6b]" : "text-gray-700"}`}>
                  {persona.label}
                </span>
                <span className="text-[10px] text-gray-400 leading-tight">{persona.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* チェックリスト本体 */}
      {selectedPersona ? (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {selectedPersona.icon} {selectedPersona.label}の進捗
              </span>
              <span className="text-sm font-bold" style={{ color: selectedPersona.color }}>
                {doneItems}/{totalItems}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: progress === 100 ? "#f59e0b" : selectedPersona.color }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{progress}% 完了</span>
              {doneItems > 0 && (
                <button onClick={handleReset} className="text-xs text-gray-400 underline">
                  リセット
                </button>
              )}
            </div>
          </div>

          {/* 申請後 待機ダッシュボード */}
          {hasApplied && <WaitingDashboard enrollmentMonth={enrollmentMonth} />}

          {selectedPersona.sections.map((section) => {
            const isPreMove = section.id === "pre-move";
            const phase = onboarding.answers?.phase;
            const showPreMove = phase === "decided" || phase === "moving_soon";
            if (isPreMove && !showPreMove) return (
              <div key={section.id} className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-400">🏠 転居を検討中・引越し準備中の方向けの<br />転居前チェックリストです</p>
              </div>
            );
            return (
              <div key={section.id}>
                <h3 className="text-sm font-bold text-gray-700 mb-2">{section.title}</h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <ChecklistItemCard
                      key={item.id}
                      item={item}
                      checked={checkedItems.has(item.id)}
                      onToggle={handleToggle}
                      accentColor={selectedPersona.color}
                      movingDate={movingDate}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {progress === 100 && (
            <div className="bg-gradient-to-b from-[#f0faf5] to-[#e0f5eb] border border-[#a8ddc0] rounded-xl p-5 text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-base font-bold text-[#2d9e6b]">すべての手続きが完了しました！</p>
              <p className="text-xs text-green-600 mt-1 mb-4">{municipalityName}での新生活、準備万端です</p>
              <Link
                href={`/${municipalityId}/timeline`}
                className="block w-full bg-[#2d9e6b] text-white text-sm font-bold py-3 rounded-xl text-center"
              >
                🌱 入園後タイムラインへ進む →
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
          <p className="text-3xl mb-3">☝️</p>
          <p className="text-sm font-semibold text-gray-600 mb-1">上から家族構成を選んでください</p>
          <p className="text-xs text-gray-400">あなたに必要な手続き・設定が表示されます</p>
        </div>
      )}

      {/* 注意書き */}
      <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700 border border-yellow-200">
        <p className="font-semibold mb-1">⚠ ご注意</p>
        <ul className="space-y-1 text-yellow-600">
          <li>・ 手続きの期限・内容は変更されることがあります。</li>
          <li>・ 詳細は各窓口に直接ご確認ください。</li>
          <li>・ チェック状態はクラウドに保存され共有URLで同期されます。</li>
        </ul>
      </div>
    </div>
    </>
  );
}

function ChecklistItemCard({
  item,
  checked,
  onToggle,
  accentColor,
  movingDate,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: (id: string) => void;
  accentColor: string;
  movingDate: Date | null;
}) {
  const urgencyBadge: Record<string, { label: string; bg: string; text: string }> = {
    high:   { label: "急ぎ", bg: "bg-red-50",    text: "text-red-600" },
    medium: { label: "優先", bg: "bg-orange-50", text: "text-orange-600" },
    low:    { label: "",     bg: "",              text: "" },
  };
  const badge = urgencyBadge[item.urgency];

  let countdownBadge: { label: string; bg: string; text: string } | null = null;
  let deadlineDateStr: string | null = null;

  if (movingDate && item.days_from_moving !== null && item.days_from_moving !== undefined) {
    const daysLeft = getDaysLeft(movingDate, item.days_from_moving);
    deadlineDateStr = getDeadlineDate(movingDate, item.days_from_moving);
    if (daysLeft < 0) {
      countdownBadge = { label: "期限切れ", bg: "bg-gray-100", text: "text-gray-500" };
    } else if (daysLeft === 0) {
      countdownBadge = { label: "今日まで！", bg: "bg-red-100", text: "text-red-700" };
    } else if (daysLeft <= 3) {
      countdownBadge = { label: `あと${daysLeft}日`, bg: "bg-red-50", text: "text-red-600" };
    } else if (daysLeft <= 14) {
      countdownBadge = { label: `あと${daysLeft}日`, bg: "bg-orange-50", text: "text-orange-600" };
    } else {
      countdownBadge = { label: `あと${daysLeft}日`, bg: "bg-blue-50", text: "text-blue-600" };
    }
  }

  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        checked ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
            checked ? "border-gray-300 bg-gray-200" : "border-gray-300"
          }`}
          style={checked ? {} : { borderColor: accentColor }}
        >
          {checked && <span className="text-gray-400 text-xs">✓</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${checked ? "line-through text-gray-400" : "text-gray-800"}`}>
              {item.text}
            </span>
            {badge.label && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
            {countdownBadge && !checked && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${countdownBadge.bg} ${countdownBadge.text}`}>
                {countdownBadge.label}
              </span>
            )}
          </div>

          {(deadlineDateStr || item.deadline) && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-gray-400">🗓</span>
              <span className={`text-[11px] font-semibold ${item.urgency === "high" ? "text-red-500" : "text-gray-500"}`}>
                {deadlineDateStr ?? item.deadline}
              </span>
            </div>
          )}

          {item.note && (
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{item.note}</p>
          )}
        </div>
      </div>
    </button>
  );
}

function WaitingDashboard({ enrollmentMonth }: { enrollmentMonth: string }) {
  let resultDateStr = "";
  let daysUntilResult: number | null = null;
  let resultPassed = false;

  if (enrollmentMonth) {
    // 入園月の45日前を結果通知予定日とする
    const enrollDate = new Date(enrollmentMonth + "-01");
    const resultDate = new Date(enrollDate);
    resultDate.setDate(resultDate.getDate() - 45);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    resultDate.setHours(0, 0, 0, 0);

    daysUntilResult = Math.ceil((resultDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    resultDateStr = `${resultDate.getMonth() + 1}月${resultDate.getDate()}日頃`;
    resultPassed = daysUntilResult <= 0;
  }

  const todos = [
    { icon: "🏫", text: "施設への見学訪問・入所説明会の日程を確認する" },
    { icon: "📝", text: "入所時に必要な持ち物リストを施設に確認する" },
    { icon: "💼", text: "職場への復帰時期・時短勤務について相談する" },
    { icon: "📋", text: "補欠・2次募集に備え、他の希望施設も検討しておく" },
    { icon: "💰", text: "保育料の目安を確認する（無償化・収入による変動あり）" },
  ];

  return (
    <div className="bg-gradient-to-br from-[#f0faf5] to-[#e6f7ef] rounded-xl p-4 border border-[#a8ddc0]">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">{resultPassed ? "📬" : "⏳"}</span>
        <div>
          <p className="text-sm font-bold text-[#2d7a5a]">申込み完了！審査待ち中</p>
          {daysUntilResult !== null ? (
            resultPassed ? (
              <p className="text-xs text-[#2d9e6b] font-semibold mt-0.5">
                結果通知の時期です。郵便・窓口をご確認ください
              </p>
            ) : (
              <p className="text-xs text-[#2d9e6b] mt-0.5">
                結果通知まで約{" "}
                <span className="font-bold text-base text-[#2d7a5a]">{daysUntilResult}</span>
                {" "}日（{resultDateStr}）
              </p>
            )
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              入園月を設定すると結果通知日のカウントダウンが表示されます
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-[#c8ead8] pt-3">
        <p className="text-xs font-semibold text-[#2d7a5a] mb-2">📌 この間にできること</p>
        <ul className="space-y-2">
          {todos.map((todo, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[#3a7a5c]">
              <span className="flex-shrink-0 mt-0.5">{todo.icon}</span>
              <span>{todo.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

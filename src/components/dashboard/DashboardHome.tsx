"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ONBOARDING_OPEN_EVENT } from "@/components/onboarding/OnboardingWrapper";
import { getSupabase } from "@/lib/supabase/client";
import type { PostEnrollmentEvent, EventAssignee } from "@/lib/data/types";
import postEnrollmentData from "@/lib/data/post-enrollment-events.json";

type Phase = "decided" | "moving_soon" | "moved" | "exploring";
type WorkStatus = "fulltime" | "parttime" | "leave";

const LOCAL_SHARE_KEY = "kosodate_share_id";

interface PriorityAction {
  icon: string;
  title: string;
  sub: string;
  href: string;
  color: string;
  bgColor: string;
}

function getPriorityActions(
  phase: Phase | undefined,
  municipalityId: string,
  municipalityName: string
): PriorityAction[] {
  switch (phase) {
    case "decided":
      return [
        { icon: "✅", title: "転居前チェックリストを始める", sub: "保育園申込みのタイミングを確認", href: `/${municipalityId}/checklist`, color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
        { icon: "🏫", title: "希望エリアの保育施設を確認", sub: "空き状況・距離・定員を比較", href: `/${municipalityId}?tab=nursery`, color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
        { icon: "❓", title: "入所申込みのスケジュールを確認", sub: "4月入所と途中入所のルールが違う", href: `/${municipalityId}/faq`, color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200" },
      ];
    case "moving_soon":
      return [
        { icon: "✅", title: "転居前タスクの残りを確認", sub: "申込書の取り寄せ・役所への届出", href: `/${municipalityId}/checklist`, color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
        { icon: "🏫", title: "保育施設の申込書を確認", sub: "転入後すぐ動けるよう準備", href: `/${municipalityId}?tab=nursery`, color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
        { icon: "🏛", title: "使える支援制度を先に確認", sub: "児童手当・医療費助成など", href: `/${municipalityId}?tab=gov`, color: "text-[#2d6eb0]", bgColor: "bg-blue-50 border-blue-200" },
      ];
    case "moved":
      return [
        { icon: "🚨", title: "転入届を提出する（14日以内）", sub: "マイナンバー・住民票の異動が最優先", href: `/${municipalityId}/checklist`, color: "text-red-600", bgColor: "bg-red-50 border-red-200" },
        { icon: "🏫", title: "保育施設の空き状況を確認", sub: "転入後すぐに申込みできる施設を探す", href: `/${municipalityId}?tab=nursery`, color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
        { icon: "🏛", title: "児童手当を申請する", sub: "出生・転入から15日以内に申請必須", href: `/${municipalityId}?tab=gov`, color: "text-[#2d6eb0]", bgColor: "bg-blue-50 border-blue-200" },
      ];
    default:
      return [
        { icon: "🏫", title: "保育施設の空き状況を確認", sub: "エリア別に認可・小規模を比較", href: `/${municipalityId}?tab=nursery`, color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
        { icon: "🏛", title: `${municipalityName}の子育て支援制度を確認`, sub: "給付金・医療費助成14種類", href: `/${municipalityId}?tab=gov`, color: "text-[#2d6eb0]", bgColor: "bg-blue-50 border-blue-200" },
        { icon: "❓", title: "よくある質問を見る", sub: "保育園申込み・転入手続きの疑問", href: `/${municipalityId}/faq`, color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200" },
      ];
  }
}

const PHASE_LABELS: Record<Phase, { label: string; icon: string; step: number }> = {
  exploring:   { label: "検討中",    icon: "🔍", step: 1 },
  decided:     { label: "物件決定",  icon: "🏠", step: 2 },
  moving_soon: { label: "引越し準備中", icon: "🚚", step: 3 },
  moved:       { label: "転入済み",  icon: "✅", step: 4 },
};

const WORK_LABELS: Record<WorkStatus, string> = {
  fulltime: "フルタイム",
  parttime: "パート・時短",
  leave:    "育休中",
};

const ASSIGNEE_LABELS: Record<string, string> = {
  mother: "👩 ママ",
  father: "👨 パパ",
  both:   "👫 二人",
};

const FEATURE_TILES = [
  { icon: "🏫", title: "保育施設マップ",    sub: "空き・距離・定員",   href: (id: string) => `/${id}?tab=nursery`, color: "text-[#2d9e6b]", bg: "bg-[#f0faf5]" },
  { icon: "✅", title: "チェックリスト",    sub: "転居前後の手続き",   href: (id: string) => `/${id}/checklist`,   color: "text-[#2d9e6b]", bg: "bg-[#f0faf5]" },
  { icon: "🌱", title: "入園後タイムライン", sub: "夫婦で担当を管理",   href: (id: string) => `/${id}/timeline`,    color: "text-[#2d9e6b]", bg: "bg-[#f0faf5]" },
  { icon: "🏛", title: "支援制度",          sub: "手当・助成14種",    href: (id: string) => `/${id}?tab=gov`,     color: "text-[#2d6eb0]", bg: "bg-blue-50"   },
  { icon: "🏥", title: "医療機関",          sub: "診療科で絞り込み",   href: (id: string) => `/${id}?tab=clinic`,  color: "text-[#e05a2b]", bg: "bg-orange-50" },
  { icon: "❓", title: "よくある質問",      sub: "申込みの疑問を解決", href: (id: string) => `/${id}/faq`,         color: "text-gray-700",  bg: "bg-gray-50"   },
];

interface DashboardHomeProps {
  municipalityId: string;
  municipalityName: string;
}

export default function DashboardHome({ municipalityId, municipalityName }: DashboardHomeProps) {
  const { answers, isDone, isLoaded, hasEnrolled, isOnLeave, enrollmentMonth } = useOnboarding();

  const [checkedCount, setCheckedCount] = useState(0);
  const [eventAssignees, setEventAssignees] = useState<Record<string, EventAssignee>>({});

  // localStorage + Supabase からデータ取得
  useEffect(() => {
    try {
      const checked = JSON.parse(localStorage.getItem("kosodate_checklist_checked") ?? "[]");
      setCheckedCount(checked.length);
    } catch {}

    const loadFromSupabase = async () => {
      const sid = localStorage.getItem(LOCAL_SHARE_KEY);
      if (!sid) return;
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("checklist_sessions")
          .select("event_assignees, checked_items")
          .eq("id", sid)
          .single();
        if (data?.event_assignees) setEventAssignees(data.event_assignees as Record<string, EventAssignee>);
        if (data?.checked_items)   setCheckedCount((data.checked_items as string[]).length);
      } catch {}
    };
    loadFromSupabase();
  }, []);

  // 入園後タイムラインのイベント一覧（育休フィルタ済み）
  const timelineEvents = useMemo(() => {
    return (postEnrollmentData.events as PostEnrollmentEvent[]).filter((e) => {
      if (e.for_leave_only && !isOnLeave) return false;
      return true;
    });
  }, [isOnLeave]);

  const totalTimeline = timelineEvents.length;
  const assignedCount = Object.keys(eventAssignees).length;
  const assignedPercent = totalTimeline > 0 ? Math.round((assignedCount / totalTimeline) * 100) : 0;

  // 今月・来月のイベント（入園後フェーズ）
  const currentMonthEvents = useMemo(() => {
    if (!hasEnrolled || !enrollmentMonth) return [];
    const [ey, em] = enrollmentMonth.split("-").map(Number);
    const now = new Date();
    const offset = (now.getFullYear() - ey) * 12 + (now.getMonth() + 1 - em);
    return timelineEvents
      .filter((e) => e.month_offset === offset || e.month_offset === offset + 1)
      .slice(0, 4);
  }, [hasEnrolled, enrollmentMonth, timelineEvents]);

  // 入園までの日数（正=未来・0=今日・負=入園後）
  const daysUntilEnrollment = useMemo(() => {
    if (!enrollmentMonth) return null;
    const [y, m] = enrollmentMonth.split("-").map(Number);
    const target = new Date(y, m - 1, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [enrollmentMonth]);

  const phase = answers?.phase;
  const phaseInfo = phase ? PHASE_LABELS[phase] : null;
  const priorityActions = getPriorityActions(phase, municipalityId, municipalityName);

  if (!isLoaded) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-10">

      {/* ══════════════════════════════════════
          入園後フェーズ: カウントダウン / 入園後ヘッダー
          ══════════════════════════════════════ */}
      {hasEnrolled && (
        <div className={`rounded-2xl p-4 text-white ${
          daysUntilEnrollment !== null && daysUntilEnrollment > 0
            ? "bg-gradient-to-r from-rose-400 to-pink-500"
            : "bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52]"
        }`}>
          <p className="text-xs text-white/70 mb-1">{municipalityName}の保育園</p>

          {daysUntilEnrollment !== null && daysUntilEnrollment > 0 ? (
            /* 入園前カウントダウン */
            <>
              <p className="text-sm font-semibold text-white/80">🌸 入園まで</p>
              <p className="text-4xl font-bold leading-none mt-0.5">あと{daysUntilEnrollment}日</p>
              <p className="text-xs text-white/60 mt-1">{enrollmentMonth?.replace("-", "年")}月入園</p>
            </>
          ) : daysUntilEnrollment !== null && daysUntilEnrollment <= 0 ? (
            /* 入園後 */
            <>
              <p className="text-sm font-semibold text-white/80">🌱 保育園生活</p>
              <p className="text-2xl font-bold leading-none mt-0.5">
                {Math.abs(daysUntilEnrollment) < 30
                  ? `${Math.abs(daysUntilEnrollment) + 1}日目`
                  : `${Math.floor(Math.abs(daysUntilEnrollment) / 30) + 1}ヶ月目`}
              </p>
              <p className="text-xs text-white/60 mt-1">{enrollmentMonth?.replace("-", "年")}月入園</p>
            </>
          ) : (
            /* 入園月未設定 */
            <h2 className="text-base font-bold">入園後の生活をサポートします</h2>
          )}

          <button
            onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
            className="mt-3 text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 transition-colors"
          >
            ✏️ 設定変更
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════
          保活フェーズ: フェーズヘッダー
          ══════════════════════════════════════ */}
      {!hasEnrolled && (
        <div className="bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52] rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-white/70">{municipalityName}への転居サポート</p>
            <div className="flex items-center gap-2">
              {phaseInfo && (
                <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                  {phaseInfo.icon} {phaseInfo.label}
                </span>
              )}
              <button
                onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
                className="text-xs bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 transition-colors"
              >
                ✏️ {isDone ? "設定変更" : "回答する"}
              </button>
            </div>
          </div>

          <h2 className="text-base font-bold">
            {phase === "moved"       ? "転入後の手続きを進めましょう"
            : phase === "moving_soon" ? "引越し前にやることを確認しましょう"
            : phase === "decided"    ? "物件が決まったら早めに動きましょう"
            : "転居先の子育て環境を確認しましょう"}
          </h2>

          {answers && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {answers.work_status && (
                <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                  💼 {WORK_LABELS[answers.work_status as WorkStatus]}
                </span>
              )}
              {answers.child_count && (
                <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                  👶 {answers.child_count}
                </span>
              )}
            </div>
          )}

          {phaseInfo && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-white/60 mb-1">
                <span>検討中</span><span>物件決定</span><span>引越し準備</span><span>転入済み</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div
                  className="h-1.5 bg-white rounded-full transition-all duration-500"
                  style={{ width: `${(phaseInfo.step / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          入園後: 夫婦の担当状況
          ══════════════════════════════════════ */}
      {hasEnrolled && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">👫 夫婦の担当状況</h3>
            <Link href={`/${municipalityId}/timeline`} className="text-xs text-[#2d9e6b] font-semibold">
              タイムラインへ →
            </Link>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>担当決定 <span className="font-bold text-gray-800">{assignedCount}</span>件</span>
            <span>
              未設定{" "}
              <span className={`font-bold ${assignedCount < totalTimeline ? "text-amber-600" : "text-gray-400"}`}>
                {totalTimeline - assignedCount}
              </span>件
            </span>
            <span className="font-bold text-[#2d9e6b]">{assignedPercent}%</span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div
              className="h-2 bg-[#2d9e6b] rounded-full transition-all duration-500"
              style={{ width: `${assignedPercent}%` }}
            />
          </div>

          {assignedCount === 0 && (
            <p className="text-xs text-gray-400">タイムラインで各タスクの担当者を設定しましょう</p>
          )}
          {assignedCount > 0 && assignedCount < totalTimeline && (
            <p className="text-xs text-amber-600">あと{totalTimeline - assignedCount}件のタスクが未設定です</p>
          )}
          {assignedCount > 0 && assignedCount === totalTimeline && (
            <p className="text-xs text-[#2d9e6b] font-semibold">🎉 すべてのタスクの担当が決まっています！</p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          入園後: 今月・来月のイベント
          ══════════════════════════════════════ */}
      {hasEnrolled && currentMonthEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">📅 今月・来月のイベント</h3>
            <Link href={`/${municipalityId}/timeline`} className="text-xs text-[#2d9e6b] font-semibold">
              すべて見る →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {currentMonthEvents.map((event) => {
              const assignee = eventAssignees[event.id];
              const monthLabel = (() => {
                if (!enrollmentMonth) return "";
                const [ey, em] = enrollmentMonth.split("-").map(Number);
                const d = new Date(ey, em - 1 + event.month_offset, 1);
                return `${d.getFullYear()}年${d.getMonth() + 1}月`;
              })();
              return (
                <Link
                  key={event.id}
                  href={`/${municipalityId}/timeline`}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{event.title}</p>
                    {monthLabel && <p className="text-[10px] text-gray-400 mt-0.5">{monthLabel}</p>}
                  </div>
                  {assignee ? (
                    <span className="text-[11px] bg-[#f0faf5] text-[#2d9e6b] px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                      {ASSIGNEE_LABELS[assignee]}
                    </span>
                  ) : (
                    <span className="text-[11px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                      未設定
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          保活中: チェックリスト進捗
          ══════════════════════════════════════ */}
      {!hasEnrolled && checkedCount > 0 && (
        <Link
          href={`/${municipalityId}/checklist`}
          className="flex items-center gap-3 bg-white rounded-xl border border-[#c8ead8] p-3 shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-full bg-[#f0faf5] flex items-center justify-center text-xl flex-shrink-0">✅</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#2d9e6b]">チェックリスト</p>
            <p className="text-xs text-gray-500">{checkedCount}件完了 · 続きを確認する</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>
      )}

      {/* ══════════════════════════════════════
          保活中: 今やること（フェーズ別）
          ══════════════════════════════════════ */}
      {!hasEnrolled && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-2">
            {phase ? "今やること" : "まずはここから"}
          </h3>
          <div className="space-y-2">
            {priorityActions.map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className={`flex items-center gap-3 p-3 rounded-xl border ${action.bgColor} active:scale-[0.98] transition-transform`}
              >
                <div className="text-2xl w-8 text-center flex-shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${action.color}`}>{action.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{action.sub}</p>
                </div>
                <span className="text-gray-300 text-sm flex-shrink-0">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          保活中: 入園後をパートナーと準備しよう
          ══════════════════════════════════════ */}
      {!hasEnrolled && (
        <Link
          href={`/${municipalityId}/timeline`}
          className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl p-4 active:scale-[0.98] transition-transform"
        >
          <span className="text-2xl flex-shrink-0">👫</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-purple-700">入園後をパートナーと一緒に準備</p>
            <p className="text-xs text-purple-500 mt-0.5">タスクの担当を決めてURLで共有できます</p>
          </div>
          <span className="text-purple-300 text-lg">›</span>
        </Link>
      )}

      {/* ══════════════════════════════════════
          共通: すべての機能タイル
          ══════════════════════════════════════ */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2">すべての機能</h3>
        <div className="grid grid-cols-3 gap-2">
          {FEATURE_TILES.map((tile) => (
            <Link
              key={tile.title}
              href={tile.href(municipalityId)}
              className={`${tile.bg} rounded-xl p-3 text-center active:scale-95 transition-transform`}
            >
              <div className="text-2xl mb-1">{tile.icon}</div>
              <p className={`text-xs font-semibold leading-tight ${tile.color}`}>{tile.title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{tile.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          オンボーディング未完了バナー
          ══════════════════════════════════════ */}
      {!isDone && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">あなたの状況を教えてください</p>
          <p className="text-xs text-amber-700 mb-3">回答に合わせて「今やること」をカスタマイズします</p>
          <button
            onClick={() => {
              try { localStorage.removeItem("kosodate_onboarding_v2"); } catch {}
              window.location.reload();
            }}
            className="w-full bg-amber-500 text-white text-sm font-semibold py-2 rounded-lg active:scale-95 transition-transform"
          >
            質問に答える（30秒）
          </button>
        </div>
      )}
    </div>
  );
}

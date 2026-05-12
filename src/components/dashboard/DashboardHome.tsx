"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ONBOARDING_OPEN_EVENT } from "@/components/onboarding/OnboardingWrapper";
import { getSupabase } from "@/lib/supabase/client";
import type { PostEnrollmentEvent, EventAssignee, SavedProperty } from "@/lib/data/types";
import { SAVED_PROPERTIES_KEY } from "@/lib/data/types";
import postEnrollmentData from "@/lib/data/post-enrollment-events.json";
import SavedPropertyCard from "@/components/surroundings/SavedPropertyCard";

type Phase = "decided" | "moving_soon" | "moved" | "exploring" | "resident" | "researching";

const LOCAL_SHARE_KEY = "kosodate_share_id";

// フェーズ別のタイル表示順（タイトルで指定）
const PHASE_TILE_ORDER: Record<Phase, string[]> = {
  researching: ["周辺環境マップ", "保育園を探す", "よくある質問", "入園準備チェックリスト", "医療機関を探す", "申請書類診断"],
  exploring:   ["周辺環境マップ", "保育園を探す", "よくある質問", "入園準備チェックリスト", "医療機関を探す", "申請書類診断"],
  decided:     ["入園準備チェックリスト", "周辺環境マップ", "保育園を探す", "申請書類診断", "よくある質問", "医療機関を探す"],
  moving_soon: ["入園準備チェックリスト", "周辺環境マップ", "申請書類診断", "保育園を探す", "よくある質問", "医療機関を探す"],
  moved:       ["入園準備チェックリスト", "保育園を探す", "よくある質問", "申請書類診断", "周辺環境マップ", "医療機関を探す"],
  resident:    ["保育園を探す", "医療機関を探す", "周辺環境マップ", "入園準備チェックリスト", "よくある質問", "申請書類診断"],
};

function getOrderedTiles(phase: Phase | undefined) {
  if (!phase) return FEATURE_TILES;
  const order = PHASE_TILE_ORDER[phase];
  return [...FEATURE_TILES].sort((a, b) => {
    const ai = order.indexOf(a.title);
    const bi = order.indexOf(b.title);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

const PHASE_LABELS: Record<Phase, { label: string; icon: string; step: number }> = {
  resident:    { label: "在住",       icon: "🏡", step: 0 },
  researching: { label: "情報収集中", icon: "📚", step: 0 },
  exploring:   { label: "検討中",    icon: "🔍", step: 1 },
  decided:     { label: "物件決定",  icon: "🏠", step: 2 },
  moving_soon: { label: "引越し準備中", icon: "🚚", step: 3 },
  moved:       { label: "転入済み",  icon: "✅", step: 4 },
};

// 入園後フェーズUIの表示制御フラグ
// 現状のコア体験は「夫婦でのタスク共有・転居前後の情報収集」のため、
// 入園後カウントダウン・担当進捗・月別イベントの3セクションは非表示にしている。
// 再導入する場合は true にするだけで復活する。
const SHOW_POST_ENROLLMENT_SECTIONS = false;


const ASSIGNEE_LABELS: Record<string, string> = {
  mother: "👩 ママ",
  father: "👨 パパ",
  both:   "👫 二人",
};

const FEATURE_TILES = [
  { icon: "🗺️", title: "周辺環境マップ",         sub: "物件の子育て環境を一画面で確認",     href: (id: string) => `/${id}/surroundings`, color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
  { icon: "🏫", title: "保育園を探す",            sub: "空き状況・距離・定員を比較",         href: (id: string) => `/${id}?tab=nursery`,  color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
  { icon: "✅", title: "入園準備チェックリスト",   sub: "入園に必要な手続きをまとめて管理",   href: (id: string) => `/${id}/checklist`,    color: "text-[#2d9e6b]", bgColor: "bg-[#f0faf5] border-[#c8ead8]" },
  { icon: "🏥", title: "医療機関を探す",          sub: "近くの病院を診療科で絞り込み",       href: (id: string) => `/${id}?tab=clinic`,   color: "text-[#e05a2b]", bgColor: "bg-orange-50 border-orange-100" },
  { icon: "📋", title: "申請書類診断",            sub: "必要書類を3問で確認",                href: (id: string) => `/${id}/apply`,        color: "text-gray-700",  bgColor: "bg-gray-50 border-gray-200" },
  { icon: "❓", title: "よくある質問",             sub: "入所申込みのルールを確認",          href: (id: string) => `/${id}/faq`,          color: "text-gray-700",  bgColor: "bg-gray-50 border-gray-200" },
];

interface DashboardHomeProps {
  municipalityId: string;
  municipalityName: string;
}

export default function DashboardHome({ municipalityId, municipalityName }: DashboardHomeProps) {
  const { answers, isDone, isLoaded, hasEnrolled, isOnLeave, enrollmentMonth } = useOnboarding();

  const [checkedCount, setCheckedCount] = useState(0);
  const [eventAssignees, setEventAssignees] = useState<Record<string, EventAssignee>>({});
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);

  // localStorage + Supabase からデータ取得
  useEffect(() => {
    try {
      const checked = JSON.parse(localStorage.getItem("kosodate_checklist_checked") ?? "[]");
      setCheckedCount(checked.length);
    } catch {}

    // 保存した物件を読み込み
    try {
      const props = JSON.parse(localStorage.getItem(SAVED_PROPERTIES_KEY) ?? "[]");
      setSavedProperties(props);
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
          .maybeSingle();
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

  // 保存した物件を削除
  const handleDeleteProperty = (id: string) => {
    const next = savedProperties.filter(p => p.id !== id);
    setSavedProperties(next);
    try { localStorage.setItem(SAVED_PROPERTIES_KEY, JSON.stringify(next)); } catch {}
  };

  const phase = answers?.phase;
  const phaseInfo = phase ? PHASE_LABELS[phase] : null;
  const orderedTiles = getOrderedTiles(phase);

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
      {SHOW_POST_ENROLLMENT_SECTIONS && hasEnrolled && (
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
            className="mt-3 text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 transition-colors min-h-[32px]"
          >
            ✏️ 設定変更
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════
          保活フェーズ: フェーズヘッダー
          ══════════════════════════════════════ */}
      {!hasEnrolled && phase === "resident" && (
        <div className="bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52] rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-white/70">{municipalityName}の子育て情報</p>
            <button
              onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
              className="text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 transition-colors min-h-[32px]"
            >
              ✏️ 設定変更
            </button>
          </div>
          <h2 className="text-base font-bold">支援制度・保育施設をまとめて確認できます</h2>
        </div>
      )}

      {!hasEnrolled && phase !== "resident" && (
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
                className="text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 transition-colors min-h-[32px]"
              >
                ✏️ {isDone ? "設定変更" : "回答する"}
              </button>
            </div>
          </div>

          <h2 className="text-base font-bold">
            {phase === "moved"        ? "転入後の手続きを進めましょう"
            : phase === "moving_soon" ? "引越し前にやることを確認しましょう"
            : phase === "decided"     ? "物件が決まったら早めに動きましょう"
            : phase === "researching" ? "転居が決まる前に情報を集めておきましょう"
            : "物件選びの前に、子育て環境をチェックしましょう"}
          </h2>

          {phaseInfo && phase !== "researching" && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-white/60 mb-1">
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

          {phase === "researching" && (
            <p className="text-[11px] text-white/60 mt-2">
              転居時期が決まったら設定を更新してください
            </p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          入園後: 夫婦の担当状況
          ══════════════════════════════════════ */}
      {SHOW_POST_ENROLLMENT_SECTIONS && hasEnrolled && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800">👫 夫婦の担当状況</h3>
            <Link href={`/${municipalityId}/checklist`} className="text-xs text-[#2d9e6b] font-semibold">
              入園後タイムラインへ →
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
      {SHOW_POST_ENROLLMENT_SECTIONS && hasEnrolled && currentMonthEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">📅 今月・来月のイベント</h3>
            <Link href={`/${municipalityId}/checklist`} className="text-xs text-[#2d9e6b] font-semibold">
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
                  href={`/${municipalityId}/checklist`}
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
          保存した物件
          ══════════════════════════════════════ */}
      {savedProperties.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-800">⭐ 保存した物件</h3>
            <Link href={`/${municipalityId}/surroundings`} className="text-xs text-[#2d9e6b] font-semibold">
              新しい物件を追加 →
            </Link>
          </div>
          <div className="space-y-3">
            {savedProperties.map(property => (
              <SavedPropertyCard
                key={property.id}
                property={property}
                municipalityId={municipalityId}
                onDelete={handleDeleteProperty}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          機能一覧（フェーズ設定時は最適順）
          ══════════════════════════════════════ */}
      <div>
        <div className="space-y-2">
          {orderedTiles.map((tile) => (
            <Link
              key={tile.title}
              href={tile.href(municipalityId)}
              className={`flex items-center gap-3 p-3 rounded-xl border ${tile.bgColor} active:scale-[0.98] transition-transform`}
            >
              <div className="text-2xl w-8 text-center flex-shrink-0">{tile.icon}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${tile.color}`}>{tile.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tile.sub}</p>
              </div>
              <span className="text-gray-300 text-sm flex-shrink-0">›</span>
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
            className="w-full bg-amber-500 text-white text-sm font-semibold py-3 rounded-lg active:scale-95 transition-transform min-h-[44px]"
          >
            質問に答える（30秒）
          </button>
        </div>
      )}
    </div>
  );
}

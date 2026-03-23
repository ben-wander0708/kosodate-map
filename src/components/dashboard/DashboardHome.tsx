"use client";

import Link from "next/link";
import { useOnboarding } from "@/hooks/useOnboarding";

type Phase = "decided" | "moving_soon" | "moved" | "exploring";
type WorkStatus = "fulltime" | "parttime" | "leave";

interface PriorityAction {
  icon: string;
  title: string;
  sub: string;
  href: string;
  color: string;
  bgColor: string;
}

function getPriorityActions(phase: Phase | undefined, municipalityId: string): PriorityAction[] {
  switch (phase) {
    case "decided":
      return [
        {
          icon: "✅",
          title: "転居前チェックリストを始める",
          sub: "保育園申込みのタイミングを確認",
          href: `/${municipalityId}/checklist`,
          color: "text-[#2d9e6b]",
          bgColor: "bg-[#f0faf5] border-[#c8ead8]",
        },
        {
          icon: "🏫",
          title: "希望エリアの保育施設を確認",
          sub: "空き状況・距離・定員を比較",
          href: `/${municipalityId}?tab=nursery`,
          color: "text-[#2d9e6b]",
          bgColor: "bg-[#f0faf5] border-[#c8ead8]",
        },
        {
          icon: "❓",
          title: "入所申込みのスケジュールを確認",
          sub: "4月入所と途中入所のルールが違う",
          href: `/${municipalityId}/faq`,
          color: "text-gray-700",
          bgColor: "bg-gray-50 border-gray-200",
        },
      ];
    case "moving_soon":
      return [
        {
          icon: "✅",
          title: "転居前タスクの残りを確認",
          sub: "申込書の取り寄せ・役所への届出",
          href: `/${municipalityId}/checklist`,
          color: "text-[#2d9e6b]",
          bgColor: "bg-[#f0faf5] border-[#c8ead8]",
        },
        {
          icon: "🏫",
          title: "保育施設の申込書を確認",
          sub: "転入後すぐ動けるよう準備",
          href: `/${municipalityId}?tab=nursery`,
          color: "text-[#2d9e6b]",
          bgColor: "bg-[#f0faf5] border-[#c8ead8]",
        },
        {
          icon: "🏛",
          title: "使える支援制度を先に確認",
          sub: "児童手当・医療費助成など",
          href: `/${municipalityId}?tab=gov`,
          color: "text-[#2d6eb0]",
          bgColor: "bg-blue-50 border-blue-200",
        },
      ];
    case "moved":
      return [
        {
          icon: "🚨",
          title: "転入届を提出する（14日以内）",
          sub: "マイナンバー・住民票の異動が最優先",
          href: `/${municipalityId}/checklist`,
          color: "text-red-600",
          bgColor: "bg-red-50 border-red-200",
        },
        {
          icon: "🏫",
          title: "保育施設の空き状況を確認",
          sub: "転入後すぐに申込みできる施設を探す",
          href: `/${municipalityId}?tab=nursery`,
          color: "text-[#2d9e6b]",
          bgColor: "bg-[#f0faf5] border-[#c8ead8]",
        },
        {
          icon: "🏛",
          title: "児童手当を申請する",
          sub: "出生・転入から15日以内に申請必須",
          href: `/${municipalityId}?tab=gov`,
          color: "text-[#2d6eb0]",
          bgColor: "bg-blue-50 border-blue-200",
        },
      ];
    case "exploring":
    default:
      return [
        {
          icon: "🏫",
          title: "保育施設の空き状況を確認",
          sub: "エリア別に認可・小規模を比較",
          href: `/${municipalityId}?tab=nursery`,
          color: "text-[#2d9e6b]",
          bgColor: "bg-[#f0faf5] border-[#c8ead8]",
        },
        {
          icon: "🏛",
          title: "総社市の子育て支援制度を確認",
          sub: "給付金・医療費助成14種類",
          href: `/${municipalityId}?tab=gov`,
          color: "text-[#2d6eb0]",
          bgColor: "bg-blue-50 border-blue-200",
        },
        {
          icon: "❓",
          title: "よくある質問を見る",
          sub: "保育園申込み・転入手続きの疑問",
          href: `/${municipalityId}/faq`,
          color: "text-gray-700",
          bgColor: "bg-gray-50 border-gray-200",
        },
      ];
  }
}

const PHASE_LABELS: Record<Phase, { label: string; icon: string; step: number }> = {
  exploring:   { label: "検討中", icon: "🔍", step: 1 },
  decided:     { label: "物件決定", icon: "🏠", step: 2 },
  moving_soon: { label: "引越し準備中", icon: "🚚", step: 3 },
  moved:       { label: "転入済み", icon: "✅", step: 4 },
};

const WORK_LABELS: Record<WorkStatus, string> = {
  fulltime: "フルタイム",
  parttime: "パート・時短",
  leave: "育休中",
};

const FEATURE_TILES = [
  {
    icon: "🏫",
    title: "保育施設マップ",
    sub: "空き・距離・定員",
    href: (id: string) => `/${id}?tab=nursery`,
    color: "text-[#2d9e6b]",
    bg: "bg-[#f0faf5]",
  },
  {
    icon: "✅",
    title: "チェックリスト",
    sub: "転居前後の手続き",
    href: (id: string) => `/${id}/checklist`,
    color: "text-[#2d9e6b]",
    bg: "bg-[#f0faf5]",
  },
  {
    icon: "🏛",
    title: "支援制度",
    sub: "手当・助成14種",
    href: (id: string) => `/${id}?tab=gov`,
    color: "text-[#2d6eb0]",
    bg: "bg-blue-50",
  },
  {
    icon: "🏥",
    title: "医療機関",
    sub: "診療科で絞り込み",
    href: (id: string) => `/${id}?tab=clinic`,
    color: "text-[#e05a2b]",
    bg: "bg-orange-50",
  },
  {
    icon: "❓",
    title: "よくある質問",
    sub: "申込みの疑問を解決",
    href: (id: string) => `/${id}/faq`,
    color: "text-gray-700",
    bg: "bg-gray-50",
  },
  {
    icon: "🛒",
    title: "生活インフラ",
    sub: "スーパー・ポイント比較",
    href: (id: string) => `/${id}/shops`,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

interface DashboardHomeProps {
  municipalityId: string;
  municipalityName: string;
}

export default function DashboardHome({ municipalityId, municipalityName }: DashboardHomeProps) {
  const { answers, isDone, isLoaded } = useOnboarding();

  const phase = answers?.phase;
  const phaseInfo = phase ? PHASE_LABELS[phase] : null;
  const priorityActions = getPriorityActions(phase, municipalityId);

  if (!isLoaded) {
    return <div className="p-4 space-y-4 animate-pulse">
      <div className="h-24 bg-gray-100 rounded-xl" />
      <div className="h-40 bg-gray-100 rounded-xl" />
    </div>;
  }

  return (
    <div className="space-y-5 p-4 pb-10">
      {/* フェーズヘッダー */}
      <div className="bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52] rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/70">{municipalityName}への転居サポート</p>
          {phaseInfo && (
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
              {phaseInfo.icon} {phaseInfo.label}
            </span>
          )}
        </div>
        <h2 className="text-base font-bold">
          {phase === "moved"
            ? "転入後の手続きを進めましょう"
            : phase === "moving_soon"
            ? "引越し前にやることを確認しましょう"
            : phase === "decided"
            ? "物件が決まったら早めに動きましょう"
            : "転居先の子育て環境を確認しましょう"}
        </h2>
        {answers && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {answers.work_status && (
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                💼 {WORK_LABELS[answers.work_status]}
              </span>
            )}
            {answers.child_count && (
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                👶 {answers.child_count}
              </span>
            )}
            {answers.children && answers.children.length > 0 && (
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                {answers.children.map((c, i) => `${i === 0 ? "" : "・"}${c.age}歳`).join("")}
              </span>
            )}
          </div>
        )}

        {/* フェーズ進捗バー */}
        {phaseInfo && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-white/60 mb-1">
              <span>検討中</span>
              <span>物件決定</span>
              <span>引越し準備</span>
              <span>転入済み</span>
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

      {/* 今やること（優先アクション） */}
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

      {/* 機能タイル */}
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
              <p className={`text-xs font-semibold ${tile.color}`}>{tile.title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{tile.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* オンボーディング未完了の場合 */}
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

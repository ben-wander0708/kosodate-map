"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { useLiff } from "@/hooks/useLiff";

interface AppHeaderProps {
  municipalityName?: string;
  municipalityId?: string;
}

const NAV_ITEMS = [
  {
    tab: "nursery",
    icon: "🏫",
    title: "保育施設",
    description: "認可保育所・こども園の空き状況と距離ランキング",
    activeColor: "text-[#2d9e6b]",
    activeBg: "bg-[#f0faf5] border border-[#c8ead8]",
    href: (municipalityId: string) => `/${municipalityId}`,
    type: "tab",
  },
  {
    tab: "clinic",
    icon: "🏥",
    title: "医療機関",
    description: "クリニック・病院を診療科別に絞り込み検索",
    activeColor: "text-[#e05a2b]",
    activeBg: "bg-orange-50 border border-orange-200",
    href: (municipalityId: string) => `/${municipalityId}?tab=clinic`,
    type: "tab",
  },
  {
    tab: "gov",
    icon: "🏛",
    title: "支援制度",
    description: "児童手当・医療費助成など14の行政サポート",
    activeColor: "text-[#2d6eb0]",
    activeBg: "bg-blue-50 border border-blue-200",
    href: (municipalityId: string) => `/${municipalityId}?tab=gov`,
    type: "tab",
  },
  {
    tab: "checklist",
    icon: "✅",
    title: "転入チェックリスト",
    description: "転入後の手続き・生活セットアップを管理",
    activeColor: "text-[#2d9e6b]",
    activeBg: "bg-[#f0faf5] border border-[#c8ead8]",
    href: (municipalityId: string) => `/${municipalityId}/checklist`,
    type: "page",
  },
  {
    tab: "shops",
    icon: "🛒",
    title: "生活インフラガイド",
    description: "スーパー・ドラッグのポイント戦略を比較",
    activeColor: "text-orange-600",
    activeBg: "bg-orange-50 border border-orange-200",
    href: (municipalityId: string) => `/${municipalityId}/shops`,
    type: "page",
  },
  {
    tab: "giveaway",
    icon: "🎁",
    title: "お譲り",
    description: "子ども用品を譲り合えるマッチング",
    activeColor: "text-[#e05a8c]",
    activeBg: "bg-pink-50 border border-pink-200",
    href: (municipalityId: string) => `/${municipalityId}/giveaway`,
    type: "page",
  },
  {
    tab: "community",
    icon: "🤝",
    title: "コミュニティ",
    description: "子育て拠点・お譲り・移住者ネットワーク",
    activeColor: "text-[#7c3aed]",
    activeBg: "bg-purple-50 border border-purple-200",
    href: (municipalityId: string) => `/${municipalityId}/community`,
    type: "page",
  },
  {
    tab: "faq",
    icon: "❓",
    title: "よくある質問",
    description: "保育園の申込み・転入手続きなど疑問を解決",
    activeColor: "text-gray-700",
    activeBg: "bg-gray-100 border border-gray-200",
    href: (municipalityId: string) => `/${municipalityId}/faq`,
    type: "page",
  },
];

function AppHeaderInner({ municipalityName, municipalityId }: AppHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isLoggedIn, profile, loading: liffLoading } = useLiff();
  const activeTab = searchParams.get("tab") ?? "nursery";

  // サブページの判定
  const isChecklistPage  = pathname?.endsWith("/checklist")  ?? false;
  const isShopsPage      = pathname?.endsWith("/shops")       ?? false;
  const isGiveawayPage   = pathname?.includes("/giveaway")    ?? false;
  const isCommunityPage  = pathname?.endsWith("/community")   ?? false;
  const isFaqPage        = pathname?.endsWith("/faq")         ?? false;

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (isChecklistPage) return item.tab === "checklist";
    if (isShopsPage)     return item.tab === "shops";
    if (isGiveawayPage)  return item.tab === "giveaway";
    if (isCommunityPage) return item.tab === "community";
    if (isFaqPage)       return item.tab === "faq";
    return item.type === "tab" && activeTab === item.tab;
  };

  return (
    <>
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4CAF82] to-[#2d9e6b] rounded-[10px] flex items-center justify-center text-white text-base">
              🗺
            </div>
            <div className="text-base font-bold text-gray-900">
              こそだて<span className="text-[#4CAF82]">マップ</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {municipalityName && (
              <div className="flex items-center gap-1 bg-[#f0faf5] border border-[#c8ead8] rounded-full px-3 py-1 text-xs text-[#2d7a5a] font-semibold">
                📍 {municipalityName}
              </div>
            )}
            {municipalityId && (
              <button
                onClick={() => setIsOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold"
                aria-label="メニューを開く"
              >
                ☰
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ドロワー */}
      {municipalityId && (
        <>
          {/* 背景オーバーレイ */}
          <div
            className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
              isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setIsOpen(false)}
          />

          {/* 左ドロワーパネル */}
          <div
            className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* ドロワーヘッダー */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-[#4CAF82] to-[#2d9e6b] rounded-lg flex items-center justify-center text-white text-sm">
                  🗺
                </div>
                <span className="font-bold text-gray-800">こそだてマップ</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm"
              >
                ✕
              </button>
            </div>

            {/* 自治体名バッジ */}
            <div className="px-4 pt-4">
              <div className="bg-[#f0faf5] border border-[#c8ead8] rounded-xl px-3 py-2 text-sm text-[#2d7a5a] font-semibold">
                📍 {municipalityName}
              </div>
            </div>

            {/* ナビゲーション */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              <p className="text-xs text-gray-400 font-medium px-1 mb-3">カテゴリ</p>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item);
                const href = municipalityId ? item.href(municipalityId) : "/";
                return (
                  <Link
                    key={item.tab}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      active ? item.activeBg : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-2xl w-8 text-center">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-semibold text-sm ${
                          active ? item.activeColor : "text-gray-800"
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                        {item.description}
                      </div>
                    </div>
                    {active && (
                      <span className={`text-xs ${item.activeColor}`}>●</span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* LINEプロフィール */}
            {!liffLoading && isLoggedIn && profile && (
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  {profile.pictureUrl ? (
                    <img
                      src={profile.pictureUrl}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white text-xs font-bold">
                      L
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">LINEでログイン中</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {profile.displayName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* フッター */}
            <div className="px-4 py-4 border-t border-gray-100">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← エリア選択に戻る
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// useSearchParams には Suspense が必要
export default function AppHeader(props: AppHeaderProps) {
  return (
    <Suspense
      fallback={
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#4CAF82] to-[#2d9e6b] rounded-[10px] flex items-center justify-center text-white text-base">
                🗺
              </div>
              <div className="text-base font-bold text-gray-900">
                こそだて<span className="text-[#4CAF82]">マップ</span>
              </div>
            </div>
          </div>
        </header>
      }
    >
      <AppHeaderInner {...props} />
    </Suspense>
  );
}

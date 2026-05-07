"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLiff } from "@/hooks/useLiff";
import { fetchGiveawayItems } from "@/lib/api/giveaway";
import PageHeader from "@/components/common/PageHeader";
import {
  GIVEAWAY_CATEGORY_LABELS,
  GIVEAWAY_CONDITION_LABELS,
  type GiveawayItem,
  type GiveawayCategory,
} from "@/lib/data/types";

interface Props {
  municipalityId: string;
  municipalityName: string;
  facilities: { id: string; name: string; subArea: string }[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export default function GiveawayListClient({ municipalityId, municipalityName }: Props) {
  const { isLoggedIn } = useLiff();
  const [items, setItems] = useState<GiveawayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<GiveawayCategory | null>(null);

  useEffect(() => {
    fetchGiveawayItems(municipalityId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [municipalityId]);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return items;
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  return (
    <>
    <PageHeader title="🎁 お譲り" subtitle={`${municipalityName} · 子育て世代の譲り合い`} municipalityId={municipalityId} />
    <div className="space-y-4 p-4">
      {/* ヘッダーバナー */}
      <div className="bg-gradient-to-r from-[#e05a8c] to-[#c2185b] rounded-xl p-4 text-white">
        <h2 className="text-base font-bold mb-1">🎁 お譲り</h2>
        <p className="text-xs text-pink-200">
          {municipalityName}の子育て世代で子ども用品を譲り合えます。
        </p>
      </div>

      {/* カテゴリフィルター */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            !selectedCategory
              ? "bg-[#e05a8c] text-white shadow-sm"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          すべて ({items.length})
        </button>
        {(Object.entries(GIVEAWAY_CATEGORY_LABELS) as [GiveawayCategory, { icon: string; label: string }][]).map(
          ([key, { icon, label }]) => {
            const count = items.filter((i) => i.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === key
                    ? "bg-[#e05a8c] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span>{icon}</span>
                <span>{label} ({count})</span>
              </button>
            );
          }
        )}
      </div>

      {/* ローディング */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* アイテム一覧 */}
      {!loading && (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/${municipalityId}/giveaway/${item.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-xl">
                  {GIVEAWAY_CATEGORY_LABELS[item.category]?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 leading-snug truncate">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                      {GIVEAWAY_CATEGORY_LABELS[item.category]?.label}
                    </span>
                    {item.condition && (
                      <span className="text-[10px] text-gray-500">
                        {GIVEAWAY_CONDITION_LABELS[item.condition]}
                      </span>
                    )}
                    {item.ageRange && (
                      <span className="text-[10px] text-gray-500">
                        {item.ageRange}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-400">
                      {item.displayName} ・ {timeAgo(item.createdAt)}
                    </span>
                    {item.status === "reserved" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        交渉中
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {item.facilityName && (
                <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
                  <span>📍</span>
                  <span>受渡し: {item.facilityName}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* 空状態 */}
      {!loading && filteredItems.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          まだ出品されたアイテムはありません
        </div>
      )}

      {/* 出品FAB */}
      {isLoggedIn && (
        <Link
          href={`/${municipalityId}/giveaway/post`}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-[#e05a8c] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[#c2185b] transition-colors"
        >
          +
        </Link>
      )}

      {/* 未ログイン案内 */}
      {!isLoggedIn && !loading && (
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 border border-blue-200">
          <p className="font-semibold mb-1">💡 出品・リクエストするには</p>
          <p>LINEアプリ内からこのページを開くとログインできます。</p>
        </div>
      )}

      {/* マイページリンク */}
      {isLoggedIn && (
        <Link
          href={`/${municipalityId}/giveaway/mypage`}
          className="block bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center text-sm font-semibold text-[#e05a8c] hover:bg-pink-50 transition-colors"
        >
          📋 マイページ（出品・リクエスト管理）
        </Link>
      )}
    </div>
    </>
  );
}

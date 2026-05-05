"use client";

import Link from "next/link";
import type { SavedProperty } from "@/lib/data/types";

interface SavedPropertyCardProps {
  property: SavedProperty;
  municipalityId: string;
  onDelete: (id: string) => void;
}

export default function SavedPropertyCard({ property, municipalityId, onDelete }: SavedPropertyCardProps) {
  const savedDate = new Date(property.savedAt).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });

  const SUMMARY_ITEMS = [
    { icon: "🏫", label: "保育",     data: property.summary.nurseries },
    { icon: "🏥", label: "医療",     data: property.summary.clinics   },
    { icon: "🛒", label: "スーパー", data: property.summary.shops     },
    { icon: "🌳", label: "公園",     data: property.summary.parks     },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        {/* ヘッダー：住所 + 削除ボタン */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">📍 {property.address}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{savedDate}に保存</p>
          </div>
          <button
            onClick={() => onDelete(property.id)}
            className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
            aria-label="削除"
          >
            ✕
          </button>
        </div>

        {/* サマリー数値 */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {SUMMARY_ITEMS.map(({ icon, label, data }) => (
            <div key={label} className="bg-gray-50 rounded-xl py-2 px-1 text-center">
              <div className="text-base">{icon}</div>
              <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{label}</div>
              <div className="text-xs font-bold text-gray-700">{data.count}件</div>
              <div className="text-[10px] text-[#2d9e6b] font-semibold">{data.nearestMin}分</div>
            </div>
          ))}
        </div>

        {/* メインCTA */}
        <Link
          href={`/${municipalityId}/checklist`}
          className="block w-full bg-gradient-to-r from-[#4CAF82] to-[#2d9e6b] text-white rounded-xl py-3 text-center text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
        >
          📋 この物件で子育て準備を始める →
        </Link>
      </div>

      {/* フッターリンク */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <Link
          href={`/${municipalityId}/surroundings`}
          className="text-xs text-[#2d9e6b] font-medium"
        >
          🗺️ マップで再確認する
        </Link>
        <span className="text-gray-200 text-xs">|</span>
        <Link
          href={`/${municipalityId}?tab=nursery`}
          className="text-xs text-gray-400 font-medium"
        >
          🏫 保育施設を詳しく見る
        </Link>
      </div>
    </div>
  );
}

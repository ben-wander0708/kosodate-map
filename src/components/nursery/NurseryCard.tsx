"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import type { NurseryWithDistance, TransportMode } from "@/lib/data/types";
import AvailabilityBadge from "./AvailabilityBadge";
import { useOnboarding } from "@/hooks/useOnboarding";

const BOOKMARK_KEY = "kosodate_nursery_bookmarks";

export function getBookmarks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function toggleBookmark(id: string): boolean {
  const current = getBookmarks();
  const next = current.includes(id)
    ? current.filter((b) => b !== id)
    : [...current, id];
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
  return next.includes(id);
}

function getGoogleMapsUrl(nursery: NurseryWithDistance): string | null {
  if (nursery.location) {
    return `https://www.google.com/maps?q=${nursery.location.lat},${nursery.location.lng}`;
  }
  if (nursery.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nursery.address)}`;
  }
  return null;
}

// 市の点数制審査でひとり親が優先される施設タイプ
const PRIORITY_TYPES_FOR_SINGLE = ["認可保育所", "認定こども園", "小規模保育", "事業所内保育"];

interface NurseryCardProps {
  nursery: NurseryWithDistance;
  rank: number;
  municipalityId: string;
  transportMode: TransportMode;
}

const typeColors: Record<string, string> = {
  "認可保育所": "bg-blue-100 text-blue-700",
  "認定こども園": "bg-purple-100 text-purple-700",
  "小規模保育": "bg-orange-100 text-orange-700",
  "事業所内保育": "bg-teal-100 text-teal-700",
  "企業主導型保育": "bg-cyan-100 text-cyan-700",
  "幼稚園": "bg-pink-100 text-pink-700",
  "認可外保育施設": "bg-gray-100 text-gray-600",
};

const transportIcons: Record<TransportMode, string> = {
  walk: "🚶",
  bike: "🚲",
  car: "🚗",
};

export default function NurseryCard({
  nursery,
  rank,
  municipalityId,
  transportMode,
}: NurseryCardProps) {
  const router = useRouter();
  const mapsUrl = getGoogleMapsUrl(nursery);

  const [bookmarked, setBookmarked] = useState(() => getBookmarks().includes(nursery.id));

  const handleBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const next = toggleBookmark(nursery.id);
    setBookmarked(next);
    // 他のコンポーネントに変更を通知
    window.dispatchEvent(new Event("kosodate_bookmark_changed"));
  }, [nursery.id]);
  const minutes =
    transportMode === "walk"
      ? nursery.walk_minutes
      : transportMode === "bike"
        ? nursery.bike_minutes
        : nursery.car_minutes;

  const { answers } = useOnboarding();
  const isSingleParent = answers?.family_type === "single";
  const showPriorityBadge = isSingleParent && PRIORITY_TYPES_FOR_SINGLE.includes(nursery.type);

  const typeColor = typeColors[nursery.type] ?? "bg-gray-100 text-gray-700";

  // 空き状況のサマリーを生成
  const hasAvailability = Object.values(nursery.availability).some(
    (v) => v === "○" || v === "△"
  );

  // 競争率バッジ
  const occupancyRate = nursery.capacity > 0
    ? Math.round((nursery.current_enrollment / nursery.capacity) * 100)
    : 0;
  const occupancyBadge =
    occupancyRate > 100
      ? { text: `定員超過 ${occupancyRate}%`, cls: "bg-red-50 text-red-500" }
      : occupancyRate >= 90
        ? { text: `充足率 ${occupancyRate}%`, cls: "bg-orange-50 text-orange-500" }
        : { text: `充足率 ${occupancyRate}%`, cls: "bg-gray-50 text-gray-500" };

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/${municipalityId}/nurseries/${nursery.id}`)}
    >
        {/* 上段: ランク + 名前 + 移動時間 */}
        <div className="flex items-start gap-3">
          {/* ランクバッジ */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#4CAF82] to-[#2d9e6b] text-white flex items-center justify-center text-sm font-bold">
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-[15px] text-gray-900 truncate">
                {nursery.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}>
                {nursery.type}
              </span>
              <span className="text-xs text-gray-500">
                {nursery.sub_area}
              </span>
            </div>
          </div>

          {/* 移動時間 + ブックマーク */}
          <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
            <button
              onClick={handleBookmark}
              className={`text-xl leading-none transition-transform active:scale-90 ${bookmarked ? "text-amber-400" : "text-gray-200"}`}
              aria-label={bookmarked ? "候補から外す" : "申請候補に追加"}
            >
              {bookmarked ? "★" : "☆"}
            </button>
            <div className="text-xs text-gray-500">
              {transportIcons[transportMode]} {nursery.distance_text}
            </div>
            <div className="text-lg font-bold text-[#2d9e6b]">
              {minutes}
              <span className="text-xs font-normal text-gray-500 ml-0.5">分</span>
            </div>
          </div>
        </div>

        {/* 下段: 空き状況 + 競争率 */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {(["age_0", "age_1", "age_2", "age_3", "age_4", "age_5"] as const).map((key) => {
              if (nursery.availability[key] === null) return null;
              const ageNum = key.replace("age_", "");
              return (
                <AvailabilityBadge
                  key={key}
                  status={nursery.availability[key]}
                  ageLabel={`${ageNum}歳`}
                />
              );
            })}
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${occupancyBadge.cls}`}>
            {occupancyBadge.text}
          </span>
        </div>

        {/* 空きあり表示 */}
        {hasAvailability && (
          <div className="mt-2 text-xs font-medium text-green-600 bg-green-50 rounded-lg px-3 py-1.5 text-center">
            空きあり（要確認）
          </div>
        )}

        {/* ひとり親優先バッジ */}
        {showPriorityBadge && (
          <div className="mt-2 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg px-3 py-1.5 text-center border border-purple-100">
            👤 総社市の選考基準でひとり親加点があります（点数制）
          </div>
        )}

        {/* Googleマップボタン */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex items-center justify-center gap-1.5 w-full border border-gray-200 rounded-lg py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/>
            </svg>
            Googleマップで開く
          </a>
        )}
    </div>
  );
}

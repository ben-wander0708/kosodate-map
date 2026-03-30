"use client";

import Link from "next/link";
import type { NurseryWithDistance, TransportMode } from "@/lib/data/types";
import AvailabilityBadge from "./AvailabilityBadge";
import { useOnboarding } from "@/hooks/useOnboarding";

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
    <Link href={`/${municipalityId}/nurseries/${nursery.id}`}>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
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

          {/* 移動時間 */}
          <div className="flex-shrink-0 text-right">
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
            👤 ひとり親は入所審査で優先されやすい施設です
          </div>
        )}
      </div>
    </Link>
  );
}

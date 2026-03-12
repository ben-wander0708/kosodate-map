"use client";

import Link from "next/link";
import type { ClinicWithDistance, TransportMode } from "@/lib/data/types";

interface ClinicCardProps {
  clinic: ClinicWithDistance;
  rank: number;
  municipalityId: string;
  transportMode: TransportMode;
}

const transportIcons: Record<TransportMode, string> = {
  walk: "🚶",
  bike: "🚲",
  car: "🚗",
};

// 子育て向けに重要な診療科に色をつける
const PRIORITY_DEPARTMENTS = ["小児科", "産婦人科", "耳鼻いんこう科", "皮膚科"];

export default function ClinicCard({
  clinic,
  rank,
  municipalityId,
  transportMode,
}: ClinicCardProps) {
  const minutes =
    transportMode === "walk"
      ? clinic.walk_minutes
      : transportMode === "bike"
        ? clinic.bike_minutes
        : clinic.car_minutes;

  const hasPriority = clinic.departments.some((d) =>
    PRIORITY_DEPARTMENTS.includes(d)
  );

  const displayDepts = clinic.departments.slice(0, 3);
  const moreDepts = clinic.departments.length - 3;

  return (
    <Link href={`/${municipalityId}/clinics/${clinic.id}`}>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        {/* 上段: ランク + 名前 + 移動時間 */}
        <div className="flex items-start gap-3">
          {/* ランクバッジ */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#e05a2b] to-[#c0392b] text-white flex items-center justify-center text-sm font-bold">
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-[15px] text-gray-900 truncate">
                {clinic.name}
              </h3>
              {clinic.facility_type === "病院" && (
                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                  病院
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {displayDepts.map((dept) => (
                <span
                  key={dept}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    PRIORITY_DEPARTMENTS.includes(dept)
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {dept}
                </span>
              ))}
              {moreDepts > 0 && (
                <span className="text-xs text-gray-400">+{moreDepts}</span>
              )}
            </div>
          </div>

          {/* 移動時間 */}
          <div className="flex-shrink-0 text-right">
            <div className="text-xs text-gray-500">
              {transportIcons[transportMode]} {clinic.distance_text}
            </div>
            <div className="text-lg font-bold text-[#e05a2b]">
              {minutes}
              <span className="text-xs font-normal text-gray-500 ml-0.5">分</span>
            </div>
          </div>
        </div>

        {/* 下段: Google評価 + 子育て科目 */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {clinic.google_rating && (
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              <span className="text-yellow-400">★</span>
              <span className="font-medium text-gray-700">{clinic.google_rating}</span>
              {clinic.google_review_count && (
                <span className="text-gray-400">({clinic.google_review_count})</span>
              )}
            </span>
          )}
          {hasPriority && (
            <span className="text-xs font-medium text-orange-600 bg-orange-50 rounded-lg px-2 py-1">
              🧒 {clinic.departments.filter((d) => PRIORITY_DEPARTMENTS.includes(d)).join("・")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

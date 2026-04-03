"use client";

import { useRouter } from "next/navigation";
import type { ClinicWithDistance, TransportMode } from "@/lib/data/types";

function getGoogleMapsUrl(clinic: ClinicWithDistance): string {
  if (clinic.google_place_id) {
    return `https://www.google.com/maps/place/?q=place_id:${clinic.google_place_id}`;
  }
  if (clinic.location) {
    return `https://www.google.com/maps?q=${clinic.location.lat},${clinic.location.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}`;
}

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
  const router = useRouter();
  const mapsUrl = getGoogleMapsUrl(clinic);
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
    <div
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/${municipalityId}/clinics/${clinic.id}`)}
    >
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

        {/* Googleマップボタン */}
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
    </div>
  );
}

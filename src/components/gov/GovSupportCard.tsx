"use client";

import { useState, useRef } from "react";
import type { GovSupport, GovSupportCategory } from "@/lib/data/types";
import { track } from "@/lib/analytics/tracker";

interface GovSupportCardProps {
  support: GovSupport;
  municipalityId: string;
  highlighted?: boolean;
}

const CATEGORY_STYLES: Record<GovSupportCategory, { bg: string; text: string; icon: string }> = {
  "給付金・手当": { bg: "bg-green-100", text: "text-green-700", icon: "💴" },
  "医療費助成":   { bg: "bg-blue-100",  text: "text-blue-700",  icon: "🏥" },
  "保育・教育":   { bg: "bg-purple-100",text: "text-purple-700",icon: "🏫" },
  "産前産後":     { bg: "bg-pink-100",  text: "text-pink-700",  icon: "🤱" },
  "相談・支援":   { bg: "bg-orange-100",text: "text-orange-700",icon: "💬" },
  "ひとり親支援": { bg: "bg-yellow-100",text: "text-yellow-700",icon: "👤" },
  "障害児支援":   { bg: "bg-gray-100",  text: "text-gray-700",  icon: "🤝" },
};

export default function GovSupportCard({ support, municipalityId, highlighted }: GovSupportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = CATEGORY_STYLES[support.category];
  const openedAt = useRef<number | null>(null);

  const storageKey = `applied_${municipalityId}_${support.id}`;
  const [applied, setApplied] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "true";
  });

  const handleApplied = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !applied;
    setApplied(next);
    localStorage.setItem(storageKey, String(next));
  };

  const handleToggle = () => {
    if (!expanded) {
      // 展開: 閲覧開始時刻を記録
      openedAt.current = Date.now();
      track("subsidy_view", {
        subsidy_id:             support.id,
        subsidy_category:       support.category,
        target_municipality_id: municipalityId,
        is_cross_municipality:  false,
        view_duration_sec:      0,   // 展開時は0、閉じる時に実時間を送る
      });
    } else if (openedAt.current !== null) {
      // 折りたたみ: 閲覧時間を計測して送信
      const durationSec = Math.floor((Date.now() - openedAt.current) / 1000);
      track("subsidy_view", {
        subsidy_id:             support.id,
        subsidy_category:       support.category,
        target_municipality_id: municipalityId,
        is_cross_municipality:  false,
        view_duration_sec:      durationSec,
      });
      openedAt.current = null;
    }
    setExpanded(!expanded);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${highlighted ? "border-2 border-[#2d9e6b]" : "border border-gray-100"}`}>
      {/* ハイライトバナー */}
      {highlighted && (
        <div className="bg-[#f0faf5] px-4 py-1.5 flex items-center gap-1.5">
          <span className="text-[#2d9e6b] text-xs font-bold">✓ あなたに関係あり</span>
        </div>
      )}
      {/* ヘッダー */}
      <button
        onClick={handleToggle}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                {style.icon} {support.category}
              </span>
              {support.no_application_needed && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                  ✓ 申請不要
                </span>
              )}
            </div>
            <h3 className="font-bold text-[15px] text-gray-900 leading-snug">
              {support.title}
            </h3>
            {support.amount && (
              <p className="mt-1 text-sm font-semibold text-[#2d9e6b]">
                {support.amount}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleApplied}
              className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${
                applied
                  ? "bg-[#2d9e6b] text-white border-[#2d9e6b]"
                  : "bg-white text-gray-400 border-gray-200"
              }`}
            >
              {applied ? "✅ 申請済み" : "申請済みにする"}
            </button>
            <span className={`text-gray-400 text-lg transition-transform ${expanded ? "rotate-180" : ""}`}>
              ▾
            </span>
          </div>
        </div>
      </button>

      {/* 展開コンテンツ */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
          {/* 対象者 */}
          <div className="pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">👥 対象者</p>
            <p className="text-sm text-gray-700">{support.target}</p>
          </div>

          {/* 概要 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">📋 内容</p>
            <p className="text-sm text-gray-700">{support.summary}</p>
          </div>

          {/* 金額詳細 */}
          {support.amount_detail.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">💴 金額詳細</p>
              <div className="space-y-1">
                {support.amount_detail.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600">{d.label}</span>
                    <span className="font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 申請方法 */}
          {support.how_to_apply && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">📝 申請方法</p>
              <p className="text-sm text-gray-700">{support.how_to_apply}</p>
            </div>
          )}

          {/* 申請・詳細リンク */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <p className="text-xs text-gray-500">{support.contact_name}</p>
            {support.url ? (
              <a
                href={support.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`block w-full text-center text-sm font-bold py-2.5 rounded-xl transition-all ${
                  support.no_application_needed
                    ? "bg-gray-100 text-gray-500"
                    : "bg-[#2d9e6b] text-white"
                }`}
              >
                {support.no_application_needed ? "詳細を確認する →" : "今すぐ申請する →"}
              </a>
            ) : (
              <p className="text-xs text-gray-400">申請先は自治体窓口にご確認ください</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

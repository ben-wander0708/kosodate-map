"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Nursery } from "@/lib/data/types";

const VISIT_ITEMS = ["diaper", "meal", "extended", "infant", "cleanliness"] as const;
type ItemState = "ok" | "unknown" | null;
type CheckData = Partial<Record<typeof VISIT_ITEMS[number], ItemState>>;

function getStorageKey(nurseryId: string) {
  return `kosodate_visit_${nurseryId}`;
}

function calcScore(data: CheckData): number {
  return VISIT_ITEMS.reduce((sum, id) => {
    const v = data[id];
    if (v === "ok") return sum + 2;
    if (v === "unknown") return sum + 1;
    return sum;
  }, 0);
}

function checkedCount(data: CheckData): number {
  return VISIT_ITEMS.filter((id) => data[id] !== null && data[id] !== undefined).length;
}

interface RankedNursery {
  nursery: Nursery;
  score: number;
  checked: number;
}

interface Props {
  nurseries: Nursery[];
  municipalityId: string;
}

export default function NurseryVisitRanking({ nurseries, municipalityId }: Props) {
  const [ranked, setRanked] = useState<RankedNursery[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const results: RankedNursery[] = [];
    for (const nursery of nurseries) {
      try {
        const raw = localStorage.getItem(getStorageKey(nursery.id));
        if (!raw) continue;
        const data: CheckData = JSON.parse(raw);
        const checked = checkedCount(data);
        if (checked === 0) continue;
        results.push({ nursery, score: calcScore(data), checked });
      } catch {}
    }
    results.sort((a, b) => b.score - a.score || b.checked - a.checked);
    setRanked(results);
    setLoaded(true);
  }, [nurseries]);

  if (!loaded || ranked.length === 0) return null;

  const MAX_SCORE = VISIT_ITEMS.length * 2; // 10点

  return (
    <div className="mb-4 rounded-xl border border-[#c8ead8] bg-[#f0faf5] overflow-hidden">
      {/* ヘッダー（タップで開閉） */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <span className="text-sm font-bold text-gray-900">
            見学メモ採点ランキング
          </span>
          <span className="text-xs font-semibold text-[#2d9e6b] bg-white rounded-full px-2 py-0.5 border border-[#c8ead8]">
            {ranked.length}件
          </span>
        </div>
        <span className="text-gray-400 text-xs">{open ? "▲ 閉じる" : "▼ 見る"}</span>
      </button>

      {/* 展開時のランキングリスト */}
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {ranked.map(({ nursery, score, checked }, i) => {
            const pct = Math.round((score / MAX_SCORE) * 100);
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
            return (
              <Link
                key={nursery.id}
                href={`/${municipalityId}/nurseries/${nursery.id}`}
                className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 active:scale-[0.98] transition-transform"
              >
                {/* 順位 */}
                <span className="text-lg w-6 text-center flex-shrink-0 leading-none">
                  {medal}
                </span>

                {/* 施設情報 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{nursery.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{nursery.type} · {nursery.sub_area}</p>
                  {/* スコアバー */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2d9e6b] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#2d9e6b] whitespace-nowrap">
                      {score}/{MAX_SCORE}点
                    </span>
                  </div>
                </div>

                <span className="text-gray-300 text-sm flex-shrink-0">›</span>
              </Link>
            );
          })}
          <p className="text-[10px] text-gray-400 text-center pt-1">
            施設詳細の見学チェックをつけると採点されます
          </p>
        </div>
      )}
    </div>
  );
}

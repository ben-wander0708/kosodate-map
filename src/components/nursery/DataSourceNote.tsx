"use client";

import { useState } from "react";
import type { DataSource } from "@/lib/data/types";

const SOURCE_LABELS: Record<string, string> = {
  nursery_availability: "空き状況",
  unlicensed_nursery:   "認可外施設",
  clinic:               "医療機関",
  gov_support:          "行政支援",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

interface Props {
  sources: DataSource[];
}

export default function DataSourceNote({ sources }: Props) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  // 最新の更新日（nursery_availability を優先）
  const primary = sources.find((s) => s.type === "nursery_availability") ?? sources[0];

  return (
    <div className="mt-4 text-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-gray-400 underline underline-offset-2"
      >
        📋 データ更新日・出典を確認
      </button>

      {open && (
        <div className="mt-2 bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 text-left space-y-2">
          <p className="text-[11px] font-bold text-gray-500 mb-1">データ出典</p>
          {sources.map((src) => (
            <div key={src.type} className="flex items-start gap-2">
              <span className="text-[10px] bg-gray-200 text-gray-600 rounded px-1.5 py-0.5 whitespace-nowrap mt-0.5">
                {SOURCE_LABELS[src.type] ?? src.type}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-600 leading-snug">{src.source_name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatDate(src.source_date)}時点のデータ
                  {src.source_url && (
                    <>

                      <a
                        href={src.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-[#2d9e6b]"
                      >
                        出典を確認 →
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-200 mt-2">
            空き状況は変動します。必ず各施設または市窓口にご確認ください。
          </p>
        </div>
      )}
    </div>
  );
}

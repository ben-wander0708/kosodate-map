"use client";

import { useState, useEffect } from "react";

const VISIT_ITEMS = [
  { id: "diaper",      label: "おむつ対応",     sub: "布おむつ必須でないか確認" },
  { id: "meal",        label: "給食",           sub: "あり・なし・弁当の別" },
  { id: "extended",    label: "延長保育",       sub: "時間・料金を確認" },
  { id: "infant",      label: "0歳児受け入れ",  sub: "月齢制限の有無" },
  { id: "cleanliness", label: "施設の清潔さ",   sub: "見学時に確認" },
] as const;

type ItemId = typeof VISIT_ITEMS[number]["id"];
type ItemState = "ok" | "unknown" | null;
type CheckData = Partial<Record<ItemId, ItemState>>;

function getStorageKey(nurseryId: string) {
  return `kosodate_visit_${nurseryId}`;
}

function nextState(current: ItemState): ItemState {
  if (current === null) return "ok";
  if (current === "ok") return "unknown";
  return null;
}

const STATE_CONFIG = {
  ok:      { icon: "✅", label: "OK",   bg: "bg-[#f0faf5] border-[#2d9e6b]", text: "text-[#2d7a5a]" },
  unknown: { icon: "❓", label: "要確認", bg: "bg-amber-50 border-amber-400",  text: "text-amber-700" },
  null:    { icon: "　", label: "未確認", bg: "bg-white border-gray-200",       text: "text-gray-400"  },
};

interface Props {
  nurseryId: string;
}

export default function NurseryVisitChecklist({ nurseryId }: Props) {
  const [checks, setChecks] = useState<CheckData>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getStorageKey(nurseryId));
      if (raw) setChecks(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, [nurseryId]);

  const toggle = (id: ItemId) => {
    setChecks((prev) => {
      const next = { ...prev, [id]: nextState(prev[id] ?? null) };
      try {
        localStorage.setItem(getStorageKey(nurseryId), JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const okCount = VISIT_ITEMS.filter((i) => checks[i.id] === "ok").length;
  const checkedCount = VISIT_ITEMS.filter((i) => checks[i.id] !== null && checks[i.id] !== undefined).length;

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">🔍 見学チェック</h2>
        {checkedCount > 0 && (
          <span className="text-xs text-gray-400">
            {okCount}件OK・{checkedCount - okCount}件要確認
          </span>
        )}
      </div>

      <div className="space-y-2">
        {VISIT_ITEMS.map((item) => {
          const state = checks[item.id] ?? null;
          const config = STATE_CONFIG[state as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.null;
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${config.bg}`}
            >
              <span className="text-base w-5 text-center flex-shrink-0">{config.icon}</span>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${state ? config.text : "text-gray-700"}`}>
                  {item.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{item.sub}</p>
              </div>
              <span className={`text-[11px] font-medium flex-shrink-0 ${config.text}`}>
                {config.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-300 mt-3 text-center">
        タップで「OK → 要確認 → 未確認」を切り替え
      </p>
    </div>
  );
}

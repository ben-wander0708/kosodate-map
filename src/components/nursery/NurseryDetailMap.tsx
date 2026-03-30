"use client";

import dynamic from "next/dynamic";
import type { Nursery } from "@/lib/data/types";

// LeafletはブラウザのDOM（画面表示の仕組み）が必要なためサーバーでは読み込まない
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-sm text-gray-400">
      地図を読み込み中...
    </div>
  ),
});

interface NurseryDetailMapProps {
  nursery: Nursery;
}

export default function NurseryDetailMap({ nursery }: NurseryDetailMapProps) {
  if (!nursery.location) return null;

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-sm font-bold text-gray-900">📍 地図</h2>
        {!nursery.geocoded && (
          <p className="text-xs text-yellow-600 mt-0.5">※ 位置は概算です</p>
        )}
      </div>
      <div className="h-52">
        <LeafletMap
          nurseries={[nursery]}
          center={nursery.location}
          zoom={15}
          selectedNurseryId={nursery.id}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Location, Nursery, Clinic, Shop, Park, Station, School, SavedProperty } from "@/lib/data/types";
import { SAVED_PROPERTIES_KEY } from "@/lib/data/types";
import type { LayerKey } from "@/components/map/LeafletMap";
import { calculateDistance, estimateMinutes } from "@/lib/geo/haversine";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), { ssr: false });

const LAYER_CONFIG: { key: LayerKey; label: string; icon: string }[] = [
  { key: "nursery", label: "保育施設", icon: "🏫" },
  { key: "clinic",  label: "医療機関", icon: "🏥" },
  { key: "shop",    label: "スーパー", icon: "🛒" },
  { key: "park",    label: "公園",     icon: "🌳" },
  { key: "station", label: "駅",       icon: "🚉" },
  { key: "school",  label: "学校",     icon: "🏫" },
];

interface SurroundingsClientProps {
  municipalityId: string;
  municipalityName: string;
  prefectureName: string;
  center: Location;
  defaultZoom: number;
  nurseries: Nursery[];
  clinics: Clinic[];
  shops: Shop[];
  parks: Park[];
  stations: Station[];
  schools: School[];
}

export default function SurroundingsClient({
  municipalityId,
  prefectureName,
  municipalityName,
  center,
  defaultZoom,
  nurseries,
  clinics,
  shops,
  parks,
  stations,
  schools,
}: SurroundingsClientProps) {
  const [propertyLocation, setPropertyLocation] = useState<Location | null>(null);
  const [propertyAddress, setPropertyAddress] = useState("");
  const [visibleLayers, setVisibleLayers] = useState<LayerKey[]>(["nursery", "clinic", "shop", "park", "station", "school"]);
  const [isSaved, setIsSaved] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapCenter = propertyLocation ?? center;
  const mapZoom = propertyLocation ? 14 : defaultZoom;

  // サマリー計算（物件位置からの最寄り距離・件数）
  const summary = useMemo(() => {
    if (!propertyLocation) return null;
    const loc = propertyLocation;

    const nearestOf = (items: { location: Location | null }[]) => {
      const dists = items.filter(i => i.location).map(i => calculateDistance(loc, i.location!));
      dists.sort((a, b) => a - b);
      return dists[0] ?? null;
    };

    const nearestNursery = nearestOf(nurseries);
    const nearestClinic  = nearestOf(clinics);
    const nearestShop    = nearestOf(shops);
    const nearestPark    = parks.length
      ? parks.map(p => calculateDistance(loc, p.location)).sort((a, b) => a - b)[0]
      : null;

    const elementarySchools = schools.filter(s => s.school_type === "elementary");
    const juniorHighSchools = schools.filter(s => s.school_type === "junior_high");
    const nearestElementary = elementarySchools.length
      ? elementarySchools.map(s => ({ dist: calculateDistance(loc, s.location), name: s.name })).sort((a, b) => a.dist - b.dist)[0]
      : null;
    const nearestJuniorHigh = juniorHighSchools.length
      ? juniorHighSchools.map(s => ({ dist: calculateDistance(loc, s.location), name: s.name })).sort((a, b) => a.dist - b.dist)[0]
      : null;

    return {
      nurseries:    { count: nurseries.filter(n => n.location).length, nearestMin: nearestNursery ? estimateMinutes(nearestNursery, "walk") : 99 },
      clinics:      { count: clinics.filter(c => c.location).length,   nearestMin: nearestClinic   ? estimateMinutes(nearestClinic,   "walk") : 99 },
      shops:        { count: shops.filter(s => s.location).length,     nearestMin: nearestShop     ? estimateMinutes(nearestShop,     "walk") : 99 },
      parks:        { count: parks.length,                              nearestMin: nearestPark     ? estimateMinutes(nearestPark,     "walk") : 99 },
      elementary:   nearestElementary ? { name: nearestElementary.name, nearestMin: estimateMinutes(nearestElementary.dist, "walk") } : null,
      juniorHigh:   nearestJuniorHigh ? { name: nearestJuniorHigh.name, nearestMin: estimateMinutes(nearestJuniorHigh.dist, "walk") } : null,
    };
  }, [propertyLocation, nurseries, clinics, shops, parks, schools]);

  // GPS取得
  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setError("お使いのブラウザはGPS機能に対応していません");
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPropertyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPropertyAddress("現在地");
        setIsLocating(false);
        setIsSaved(false);
      },
      () => {
        setError("現在地を取得できませんでした");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // 住所検索
  const handleAddressSearch = useCallback(async () => {
    if (!addressQuery.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const q = encodeURIComponent(prefectureName + municipalityName + addressQuery);
      const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${q}`);
      const data = await res.json();
      if (!data?.length) {
        setError("住所が見つかりませんでした。例: 「総社駅前1丁目」のように入力してください。");
        return;
      }
      const [lng, lat] = data[0].geometry.coordinates;
      setPropertyLocation({ lat, lng });
      setPropertyAddress(data[0].properties.title);
      setAddressQuery("");
      setShowAddressInput(false);
      setIsSaved(false);
    } catch {
      setError("住所の検索に失敗しました。もう一度お試しください。");
    } finally {
      setIsSearching(false);
    }
  }, [addressQuery, prefectureName, municipalityName]);

  // レイヤートグル
  const toggleLayer = (key: LayerKey) => {
    setVisibleLayers(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // 物件保存
  const handleSave = useCallback(() => {
    if (!propertyLocation || !summary) return;
    const property: SavedProperty = {
      id: crypto.randomUUID(),
      address: propertyAddress || "住所未設定",
      lat: propertyLocation.lat,
      lng: propertyLocation.lng,
      savedAt: new Date().toISOString(),
      summary,
    };
    try {
      const existing: SavedProperty[] = JSON.parse(localStorage.getItem(SAVED_PROPERTIES_KEY) ?? "[]");
      localStorage.setItem(SAVED_PROPERTIES_KEY, JSON.stringify([property, ...existing]));
      setIsSaved(true);
    } catch {}
  }, [propertyLocation, propertyAddress, summary]);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">

      {/* ─── ヘッダー ─── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Link href={`/${municipalityId}`} className="text-gray-400 text-lg">‹</Link>
          <div>
            <h1 className="text-sm font-bold text-gray-800">🗺️ 周辺環境マップ</h1>
            <p className="text-xs text-gray-400">{municipalityName} · 物件の子育て環境を確認</p>
          </div>
        </div>
      </div>

      {/* ─── 住所入力 ─── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleGPS}
            disabled={isLocating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#4CAF82] to-[#2d9e6b] text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isLocating ? <><span className="animate-spin">⏳</span>取得中…</> : <>📍 現在地を起点にする</>}
          </button>
          <button
            onClick={() => { setShowAddressInput(v => !v); setError(null); }}
            className="px-4 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            🔍 住所で入力
          </button>
        </div>

        {showAddressInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={addressQuery}
              onChange={e => setAddressQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddressSearch()}
              placeholder="例: 総社駅前1丁目"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF82]"
              autoFocus
            />
            <button
              onClick={handleAddressSearch}
              disabled={isSearching || !addressQuery.trim()}
              className="px-4 bg-[#4CAF82] text-white rounded-xl py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              {isSearching ? "検索中…" : "設定"}
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        {propertyAddress && !error && (
          <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
            📍 起点：{propertyAddress}
          </p>
        )}
      </div>

      {/* ─── カテゴリフィルター ─── */}
      <div className="bg-white border-b border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0 scrollbar-hide">
        {LAYER_CONFIG.map(({ key, label, icon }) => {
          const active = visibleLayers.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                active
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-400 border-gray-200"
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── 地図 ─── */}
      <div className="flex-1 relative min-h-0">
        <LeafletMap
          center={mapCenter}
          zoom={mapZoom}
          nurseries={nurseries}
          clinics={clinics}
          shops={shops}
          parks={parks}
          stations={stations}
          schools={schools}
          propertyLocation={propertyLocation}
          visibleLayers={visibleLayers}
          className="h-full"
        />

        {/* 未設定時のヒント */}
        {!propertyLocation && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg text-xs text-gray-600 font-medium whitespace-nowrap pointer-events-none">
            📍 上の「現在地」または「住所」で物件の場所を設定してください
          </div>
        )}
      </div>

      {/* ─── 下部パネル（物件設定後に表示） ─── */}
      {propertyLocation && summary && (
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-5 flex-shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">

          {/* サマリーチップ */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            {[
              { icon: "🏫", label: "保育施設", data: summary.nurseries },
              { icon: "🏥", label: "医療機関", data: summary.clinics   },
              { icon: "🛒", label: "スーパー", data: summary.shops     },
              { icon: "🌳", label: "公園",     data: summary.parks     },
            ].map(({ icon, label, data }) => (
              <div key={label} className="flex-shrink-0 bg-gray-50 rounded-xl px-3 py-2 text-center min-w-[76px]">
                <div className="text-xl">{icon}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
                <div className="text-xs font-bold text-gray-800 mt-0.5">{data.count}件</div>
                <div className="text-[10px] text-[#2d9e6b] font-semibold">最寄{data.nearestMin}分</div>
              </div>
            ))}
            {summary.elementary && (
              <div className="flex-shrink-0 bg-blue-50 rounded-xl px-3 py-2 text-center min-w-[76px]">
                <div className="text-xl">🏫</div>
                <div className="text-[10px] text-gray-400 mt-0.5">最寄小学校</div>
                <div className="text-[10px] font-bold text-gray-800 mt-0.5 truncate max-w-[80px]">{summary.elementary.name.replace("市立", "")}</div>
                <div className="text-[10px] text-blue-600 font-semibold">徒歩{summary.elementary.nearestMin}分</div>
              </div>
            )}
            {summary.juniorHigh && (
              <div className="flex-shrink-0 bg-purple-50 rounded-xl px-3 py-2 text-center min-w-[76px]">
                <div className="text-xl">🏫</div>
                <div className="text-[10px] text-gray-400 mt-0.5">最寄中学校</div>
                <div className="text-[10px] font-bold text-gray-800 mt-0.5 truncate max-w-[80px]">{summary.juniorHigh.name.replace("市立", "")}</div>
                <div className="text-[10px] text-purple-600 font-semibold">徒歩{summary.juniorHigh.nearestMin}分</div>
              </div>
            )}
          </div>

          {/* CTA */}
          {isSaved ? (
            <div className="flex flex-col gap-2">
              <div className="w-full bg-green-50 border border-green-200 rounded-xl py-3 text-center text-sm font-semibold text-green-700">
                ✅ 保存しました！
              </div>
              <Link
                href={`/${municipalityId}`}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors block"
              >
                ← ダッシュボードで確認する
              </Link>
            </div>
          ) : (
            <button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-[#4CAF82] to-[#2d9e6b] text-white rounded-xl py-3.5 text-sm font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
            >
              ⭐ この物件を保存する
            </button>
          )}
        </div>
      )}
    </div>
  );
}

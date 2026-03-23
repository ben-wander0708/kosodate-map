"use client";

import { useState, useCallback } from "react";
import type { Location } from "@/lib/data/types";

interface AddressInputProps {
  onLocationSet: (location: Location) => void;
  defaultCenter: Location;
}

export default function AddressInput({
  onLocationSet,
}: AddressInputProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const handleGPSClick = useCallback(() => {
    if (!navigator.geolocation) {
      setError("お使いのブラウザはGPS機能に対応していません");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        onLocationSet(location);
        setIsLocating(false);
        setLocationLabel("現在地");
        setShowAddressInput(false);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("位置情報の許可が必要です。ブラウザの設定を確認してください。");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("現在地を取得できませんでした");
            break;
          default:
            setError("位置情報の取得に失敗しました");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onLocationSet]);

  const handleAddressSearch = useCallback(async () => {
    if (!addressQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const query = encodeURIComponent(addressQuery + " 岡山県総社市");
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&accept-language=ja`,
        { headers: { "Accept-Language": "ja" } }
      );
      const data = await res.json();

      if (data.length === 0) {
        setError("住所が見つかりませんでした。もう少し詳しく入力してみてください。");
        setIsSearching(false);
        return;
      }

      const { lat, lon, display_name } = data[0];
      onLocationSet({ lat: parseFloat(lat), lng: parseFloat(lon) });
      setLocationLabel(display_name.split(",")[0]);
      setShowAddressInput(false);
      setAddressQuery("");
    } catch {
      setError("住所の検索に失敗しました。もう一度お試しください。");
    } finally {
      setIsSearching(false);
    }
  }, [addressQuery, onLocationSet]);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-sm font-semibold text-gray-700 mb-3">
        📍 起点の場所を設定
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleGPSClick}
          disabled={isLocating}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#4CAF82] to-[#2d9e6b] text-white rounded-lg py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLocating ? (
            <>
              <span className="animate-spin">⏳</span>
              取得中...
            </>
          ) : locationLabel === "現在地" ? (
            <>✅ 現在地（再取得）</>
          ) : (
            <>📍 現在地を使う</>
          )}
        </button>

        <button
          onClick={() => {
            setShowAddressInput((v) => !v);
            setError(null);
          }}
          className="px-4 bg-gray-100 text-gray-600 rounded-lg py-3 text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          🔍 住所で探す
        </button>
      </div>

      {showAddressInput && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
            placeholder="例: 総社駅前1丁目"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF82]"
            autoFocus
          />
          <button
            onClick={handleAddressSearch}
            disabled={isSearching || !addressQuery.trim()}
            className="px-4 bg-[#4CAF82] text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            {isSearching ? "検索中..." : "設定"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {locationLabel && !error && (
        <div className="mt-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
          ✅ 「{locationLabel}」を起点に近い順でランキングしています。
        </div>
      )}
    </div>
  );
}

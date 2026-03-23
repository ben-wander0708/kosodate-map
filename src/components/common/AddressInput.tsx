"use client";

import { useState, useCallback } from "react";
import type { Location } from "@/lib/data/types";

interface AddressInputProps {
  onLocationSet: (location: Location) => void;
  defaultCenter: Location;
}

export default function AddressInput({
  onLocationSet,
  defaultCenter,
}: AddressInputProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSet, setLocationSet] = useState(false);

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
        setLocationSet(true);
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

  // デモ用：総社駅周辺を自宅として設定
  const handleDemoClick = useCallback(() => {
    onLocationSet(defaultCenter);
    setLocationSet(true);
  }, [onLocationSet, defaultCenter]);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="text-sm font-semibold text-gray-700 mb-3">
        📍 自宅の位置を設定
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
          ) : locationSet ? (
            <>✅ 位置を再取得</>
          ) : (
            <>📍 現在地を使う</>
          )}
        </button>

        <button
          onClick={handleDemoClick}
          className="px-4 bg-gray-100 text-gray-600 rounded-lg py-3 text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          総社駅を起点に
        </button>
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {locationSet && !error && (
        <div className="mt-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
          ✅ 位置を設定しました。近い順に保育施設をランキングしています。
        </div>
      )}
    </div>
  );
}

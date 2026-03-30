"use client";

import { useEffect, useRef } from "react";
import type { Nursery, Clinic, Location } from "@/lib/data/types";

// Leafletはクライアントサイドのみでインポート
let L: typeof import("leaflet") | null = null;

interface LeafletMapProps {
  nurseries: Nursery[];
  clinics?: Clinic[];
  center: { lat: number; lng: number };
  zoom: number;
  userLocation?: Location | null;
  selectedNurseryId?: string | null;
  onNurseryClick?: (nurseryId: string) => void;
  className?: string;
}

export default function LeafletMap({
  nurseries,
  clinics = [],
  center,
  zoom,
  userLocation,
  selectedNurseryId,
  onNurseryClick,
  className = "",
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // className（高さ）が変わったら地図サイズを再計算
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 50);
    return () => clearTimeout(timer);
  }, [className]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import of Leaflet
    import("leaflet").then((leaflet) => {
      L = leaflet;

      if (!mapRef.current) return;

      const map = L.map(mapRef.current).setView(
        [center.lat, center.lng],
        zoom
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // 保育施設マーカー
      nurseries.forEach((nursery) => {
        if (!nursery.location) return;

        const isSelected = nursery.id === selectedNurseryId;

        const icon = L!.divIcon({
          className: "custom-marker",
          html: `<div style="
            width: ${isSelected ? "36px" : "28px"};
            height: ${isSelected ? "36px" : "28px"};
            background: ${isSelected ? "#1a7a52" : "#4CAF82"};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? "14px" : "11px"};
            color: white;
            font-weight: bold;
            transition: all 0.2s;
          ">${nursery.type === "認定こども園" ? "園" : "保"}</div>`,
          iconSize: isSelected ? [36, 36] : [28, 28],
          iconAnchor: isSelected ? [18, 18] : [14, 14],
        });

        const marker = L!.marker(
          [nursery.location.lat, nursery.location.lng],
          { icon }
        ).addTo(map);

        // ポップアップ
        const availText = nursery.availability.age_0 === "△" || nursery.availability.age_0 === "○"
          ? "0歳児空きあり"
          : "空きなし";

        marker.bindPopup(
          `<div style="font-family: -apple-system, sans-serif; min-width: 140px;">
            <strong style="font-size: 13px;">${nursery.name}</strong>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">
              ${nursery.type} | 定員${nursery.capacity}名
            </div>
            <div style="font-size: 11px; margin-top: 4px; color: ${availText.includes("空きあり") ? "#2d9e6b" : "#e74c3c"};">
              ${availText}
            </div>
          </div>`
        );

        marker.on("click", () => {
          onNurseryClick?.(nursery.id);
        });
      });

      // 医療機関マーカー
      clinics.forEach((clinic) => {
        if (!clinic.location) return;

        const icon = L!.divIcon({
          className: "custom-marker",
          html: `<div style="
            width: 28px;
            height: 28px;
            background: #e05a2b;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: white;
            font-weight: bold;
          ">${clinic.facility_type === "病院" ? "病" : "医"}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const depts = clinic.departments.slice(0, 3).join("・");
        L!.marker([clinic.location.lat, clinic.location.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family: -apple-system, sans-serif; min-width: 140px;">
              <strong style="font-size: 13px;">${clinic.name}</strong>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">${depts}</div>
              ${clinic.tel ? `<div style="font-size: 11px; margin-top: 4px;">📞 ${clinic.tel}</div>` : ""}
            </div>`
          );
      });

      // ユーザー位置マーカー
      if (userLocation) {
        const homeIcon = L.divIcon({
          className: "home-marker",
          html: `<div style="
            width: 40px;
            height: 40px;
            background: #3b82f6;
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 12px rgba(59,130,246,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          ">🏠</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        L.marker([userLocation.lat, userLocation.lng], {
          icon: homeIcon,
        })
          .addTo(map)
          .bindPopup("自宅の位置");

        // ユーザー位置にパン
        map.setView([userLocation.lat, userLocation.lng], 14);
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, nurseries, clinics, userLocation, selectedNurseryId, onNurseryClick]);

  return (
    <div
      ref={mapRef}
      className={`w-full ${className}`}
      style={{ minHeight: "250px" }}
    />
  );
}

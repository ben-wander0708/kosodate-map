"use client";

import { useEffect, useRef } from "react";
import type { Nursery, Clinic, Shop, Park, Station, School, Location } from "@/lib/data/types";

// Leafletはクライアントサイドのみでインポート
let L: typeof import("leaflet") | null = null;

export type LayerKey = "nursery" | "clinic" | "shop" | "park" | "station" | "school";

interface LeafletMapProps {
  nurseries?: Nursery[];
  clinics?: Clinic[];
  shops?: Shop[];
  parks?: Park[];
  schools?: School[];
  stations?: Station[];
  center: { lat: number; lng: number };
  zoom: number;
  userLocation?: Location | null;
  /** 周辺環境マップ用：物件ピン（userLocationと区別） */
  propertyLocation?: Location | null;
  selectedNurseryId?: string | null;
  onNurseryClick?: (nurseryId: string) => void;
  /** 表示するレイヤーを限定。未指定の場合は全て表示 */
  visibleLayers?: LayerKey[];
  className?: string;
}

function makeMarker(
  L: typeof import("leaflet"),
  color: string,
  label: string,
  size = 28
) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size <= 28 ? "11px" : "14px"};
      color: white;
      font-weight: bold;
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function LeafletMap({
  nurseries = [],
  clinics = [],
  shops = [],
  parks = [],
  stations = [],
  schools = [],
  center,
  zoom,
  userLocation,
  propertyLocation,
  selectedNurseryId,
  onNurseryClick,
  visibleLayers,
  className = "",
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const isVisible = (layer: LayerKey) =>
    !visibleLayers || visibleLayers.includes(layer);

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

    import("leaflet").then((leaflet) => {
      L = leaflet;
      if (!mapRef.current) return;

      const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // ── 保育施設マーカー ──
      if (isVisible("nursery")) {
        nurseries.forEach((nursery) => {
          if (!nursery.location) return;
          const isSelected = nursery.id === selectedNurseryId;
          const color = isSelected ? "#1a7a52" : "#4CAF82";
          const size = isSelected ? 36 : 28;
          const label = nursery.type === "認定こども園" ? "園" : "保";

          const icon = L!.divIcon({
            className: "custom-marker",
            html: `<div style="
              width: ${size}px; height: ${size}px;
              background: ${color}; border: 3px solid white;
              border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex; align-items: center; justify-content: center;
              font-size: ${isSelected ? "14px" : "11px"}; color: white; font-weight: bold; transition: all 0.2s;
            ">${label}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          const availText =
            nursery.availability.age_0 === "△" || nursery.availability.age_0 === "○"
              ? "0歳児空きあり"
              : "空きなし";

          const marker = L!.marker([nursery.location.lat, nursery.location.lng], { icon }).addTo(map);
          marker.bindPopup(
            `<div style="font-family:-apple-system,sans-serif;min-width:140px;">
              <strong style="font-size:13px;">${nursery.name}</strong>
              <div style="font-size:11px;color:#666;margin-top:4px;">${nursery.type} | 定員${nursery.capacity}名</div>
              <div style="font-size:11px;margin-top:4px;color:${availText.includes("空きあり") ? "#2d9e6b" : "#e74c3c"};">${availText}</div>
            </div>`
          );
          marker.on("click", () => onNurseryClick?.(nursery.id));
        });
      }

      // ── 医療機関マーカー ──
      if (isVisible("clinic")) {
        clinics.forEach((clinic) => {
          if (!clinic.location) return;
          const icon = makeMarker(L!, "#e05a2b", clinic.facility_type === "病院" ? "病" : "医");
          const depts = clinic.departments.slice(0, 3).join("・");
          L!.marker([clinic.location.lat, clinic.location.lng], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:-apple-system,sans-serif;min-width:140px;">
                <strong style="font-size:13px;">${clinic.name}</strong>
                <div style="font-size:11px;color:#666;margin-top:4px;">${depts}</div>
                ${clinic.tel ? `<div style="font-size:11px;margin-top:4px;">📞 ${clinic.tel}</div>` : ""}
              </div>`
            );
        });
      }

      // ── スーパー等マーカー ──
      if (isVisible("shop")) {
        shops.forEach((shop) => {
          if (!shop.location) return;
          const icon = makeMarker(L!, "#e74c3c", "買");
          L!.marker([shop.location.lat, shop.location.lng], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:-apple-system,sans-serif;min-width:130px;">
                <strong style="font-size:13px;">${shop.name}</strong>
                <div style="font-size:11px;color:#666;margin-top:4px;">${shop.hours}</div>
              </div>`
            );
        });
      }

      // ── 公園マーカー ──
      if (isVisible("park")) {
        parks.forEach((park) => {
          if (!park.location) return;
          const icon = makeMarker(L!, "#27ae60", "公");
          L!.marker([park.location.lat, park.location.lng], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:-apple-system,sans-serif;min-width:120px;">
                <strong style="font-size:13px;">${park.name}</strong>
              </div>`
            );
        });
      }

      // ── 駅マーカー ──
      if (isVisible("station")) {
        stations.forEach((station) => {
          if (!station.location) return;
          const icon = makeMarker(L!, "#2c3e50", "駅");
          const lines = station.lines?.join(" / ") ?? "";
          L!.marker([station.location.lat, station.location.lng], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:-apple-system,sans-serif;min-width:120px;">
                <strong style="font-size:13px;">${station.name}</strong>
                ${lines ? `<div style="font-size:11px;color:#666;margin-top:4px;">${lines}</div>` : ""}
              </div>`
            );
        });
      }

      // ── 学校マーカー ──
      if (isVisible("school")) {
        schools.forEach((school) => {
          const isElementary = school.school_type === "elementary";
          const color = isElementary ? "#1e40af" : "#7c3aed";
          const label = isElementary ? "小" : "中";
          const icon = makeMarker(L!, color, label);
          L!.marker([school.location.lat, school.location.lng], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:-apple-system,sans-serif;min-width:130px;">
                <strong style="font-size:13px;">${school.name}</strong>
                <div style="font-size:11px;color:#666;margin-top:4px;">${isElementary ? "小学校" : "中学校"}${school.district ? ` | ${school.district}学区` : ""}</div>
              </div>`
            );
        });
      }

      // ── 物件ピン（周辺環境マップ用） ──
      if (propertyLocation) {
        const homeIcon = L.divIcon({
          className: "home-marker",
          html: `<div style="
            width: 44px; height: 44px;
            background: #3b82f6; border: 4px solid white;
            border-radius: 50%; box-shadow: 0 3px 12px rgba(59,130,246,0.55);
            display: flex; align-items: center; justify-content: center; font-size: 20px;
          ">🏠</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        L.marker([propertyLocation.lat, propertyLocation.lng], { icon: homeIcon })
          .addTo(map)
          .bindPopup("検討中の物件");
        map.setView([propertyLocation.lat, propertyLocation.lng], zoom);
      }

      // ── 自宅ピン（保活マップ用） ──
      if (userLocation) {
        const homeIcon = L.divIcon({
          className: "home-marker",
          html: `<div style="
            width: 40px; height: 40px;
            background: #3b82f6; border: 4px solid white;
            border-radius: 50%; box-shadow: 0 2px 12px rgba(59,130,246,0.5);
            display: flex; align-items: center; justify-content: center; font-size: 18px;
          ">🏠</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        L.marker([userLocation.lat, userLocation.lng], { icon: homeIcon })
          .addTo(map)
          .bindPopup("自宅の位置");
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, zoom, nurseries, clinics, shops, parks, stations, userLocation, propertyLocation, selectedNurseryId, onNurseryClick, visibleLayers]);

  return <div ref={mapRef} className={`w-full ${className}`} />;
}

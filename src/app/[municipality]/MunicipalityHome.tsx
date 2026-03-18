"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { Municipality, Nursery, Clinic, GovSupport, GovSupportCategory, Location, TransportMode } from "@/lib/data/types";
import { rankNurseriesByDistance, rankClinicsByDistance } from "@/lib/geo/haversine";
import NurseryCard from "@/components/nursery/NurseryCard";
import ClinicCard from "@/components/clinic/ClinicCard";
import GovSupportCard from "@/components/gov/GovSupportCard";
import TransportSelector from "@/components/nursery/TransportSelector";
import AddressInput from "@/components/common/AddressInput";
import { track, updateLocation } from "@/lib/analytics/tracker";
import OnboardingModal, { ONBOARDING_DONE_KEY } from "@/components/onboarding/OnboardingModal";

// Leafletはクライアントのみでロード（SSR無効化）
const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[250px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400 text-sm">
      地図を読み込み中...
    </div>
  ),
});

type TabType = "nursery" | "clinic" | "gov";

// 子育て世代に重要な診療科（フィルターで優先表示）
const FILTER_PRIORITY_DEPTS = ["小児科", "耳鼻いんこう科", "皮膚科", "産婦人科", "内科", "整形外科"];

// 行政サポートカテゴリの表示順
const GOV_CATEGORY_ORDER: GovSupportCategory[] = [
  "給付金・手当",
  "医療費助成",
  "保育・教育",
  "産前産後",
  "相談・支援",
  "ひとり親支援",
  "障害児支援",
];

interface MunicipalityHomeProps {
  municipality: Municipality;
  nurseries: Nursery[];
  clinics: Clinic[];
  govSupports: GovSupport[];
}

export default function MunicipalityHome({
  municipality,
  nurseries,
  clinics,
  govSupports,
}: MunicipalityHomeProps) {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>("bike");
  const [selectedNurseryId, setSelectedNurseryId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabType | null) ?? "nursery";
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 初回訪問時にオンボーディングを表示（800ms 遅延でメインUIを先に見せる）
  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_DONE_KEY);
      if (!done) {
        const t = setTimeout(() => setShowOnboarding(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage 非対応環境では無視
    }
  }, []);

  // タブ切り替え時にフィルターをリセット
  useEffect(() => {
    if (activeTab !== "clinic") setSelectedDepartment(null);
    if (activeTab !== "nursery") setSelectedAge(null);
  }, [activeTab]);

  const defaultCenter: Location = {
    lat: municipality.center_lat,
    lng: municipality.center_lng,
  };

  // 利用可能な診療科一覧（優先科目を先頭に）
  const availableDepartments = useMemo(() => {
    const allDepts = new Set<string>();
    clinics.forEach((c) => c.departments.forEach((d) => allDepts.add(d)));
    const priority = FILTER_PRIORITY_DEPTS.filter((d) => allDepts.has(d));
    const others = [...allDepts]
      .filter((d) => !FILTER_PRIORITY_DEPTS.includes(d))
      .sort();
    return [...priority, ...others];
  }, [clinics]);

  // 診療科フィルター適用後のクリニック一覧
  const filteredClinics = useMemo(() => {
    if (!selectedDepartment) return clinics;
    return clinics.filter((c) => c.departments.includes(selectedDepartment));
  }, [clinics, selectedDepartment]);

  // 年齢フィルター適用後の保育施設一覧
  const filteredNurseries = useMemo(() => {
    if (selectedAge === null) return nurseries;
    return nurseries.filter((n) => {
      const ageKey = `age_${selectedAge}` as keyof typeof n.availability;
      const status = n.availability[ageKey];
      return status === "○" || status === "△";
    });
  }, [nurseries, selectedAge]);

  const rankedNurseries = useMemo(() => {
    if (!userLocation) return null;
    return rankNurseriesByDistance(filteredNurseries, userLocation);
  }, [filteredNurseries, userLocation]);

  const rankedClinics = useMemo(() => {
    if (!userLocation) return null;
    return rankClinicsByDistance(filteredClinics, userLocation);
  }, [filteredClinics, userLocation]);

  const handleLocationSet = useCallback((location: Location) => {
    setUserLocation(location);
    // ユーザー位置をトラッカーに反映（H3インデックス計算に使用）
    updateLocation(location.lat, location.lng);
  }, []);

  // ===================================
  // トラッキング: 初回マウント（セッション開始は AnalyticsProvider が担当）
  // ===================================
  const isFirstRender = useRef(true);

  // 保育施設タブ: 年齢フィルター変更 → searchイベント
  useEffect(() => {
    if (isFirstRender.current) return;
    if (activeTab !== "nursery") return;
    track("search", {
      query: null,
      facility_categories: ["保育施設"],
      age_filter_months: selectedAge !== null ? selectedAge * 12 : null,
      commute_mode: transportMode,
      target_municipality_id: municipality.id,
      is_cross_municipality: false,
      result_count: filteredNurseries.length,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAge]);

  // 医療機関タブ: 診療科フィルター変更 → searchイベント
  useEffect(() => {
    if (isFirstRender.current) return;
    if (activeTab !== "clinic") return;
    track("search", {
      query: selectedDepartment,
      facility_categories: ["医療機関"],
      age_filter_months: null,
      commute_mode: transportMode,
      target_municipality_id: municipality.id,
      is_cross_municipality: false,
      result_count: filteredClinics.length,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment]);

  // タブ切り替え → searchイベント（タブ変更 = 情報収集意図の変化）
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const categoryMap: Record<string, string[]> = {
      nursery: ["保育施設"],
      clinic:  ["医療機関"],
      gov:     ["行政支援"],
    };
    track("search", {
      query: null,
      facility_categories: categoryMap[activeTab] ?? [],
      age_filter_months: null,
      commute_mode: null,
      target_municipality_id: municipality.id,
      is_cross_municipality: false,
      result_count: activeTab === "nursery" ? nurseries.length
                  : activeTab === "clinic"  ? clinics.length
                  : govSupports.length,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 行政サポートをカテゴリ順にグルーピング
  const govSupportsByCategory = useMemo(() => {
    const map = new Map<GovSupportCategory, GovSupport[]>();
    GOV_CATEGORY_ORDER.forEach((cat) => {
      const items = govSupports.filter((s) => s.category === cat);
      if (items.length > 0) map.set(cat, items);
    });
    return map;
  }, [govSupports]);

  const dataDate = nurseries[0]?.data_date ?? "不明";

  return (
    <div className="space-y-4 p-4">
      {/* オンボーディングモーダル（初回訪問時のみ） */}
      {showOnboarding && (
        <OnboardingModal
          municipalityName={municipality.name_ja}
          onClose={() => setShowOnboarding(false)}
        />
      )}

      {/* ウェルカムバナー */}
      <div className="bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52] rounded-xl p-4 text-white">
        <h2 className="text-base font-bold mb-1">
          {municipality.name_ja}の子育て情報
        </h2>
        <p className="text-xs text-green-200">
          {activeTab === "nursery" && `🏫 保育施設 ${nurseries.length}件 ・ データ更新日: ${dataDate}`}
          {activeTab === "clinic" && `🏥 医療機関 ${clinics.length}件`}
          {activeTab === "gov" && `🏛 支援制度 ${govSupports.length}件`}
        </p>
      </div>

      {/* 自宅位置設定 */}
      <AddressInput
        onLocationSet={handleLocationSet}
        defaultCenter={defaultCenter}
      />

      {/* マップ（支援制度タブでは非表示） */}
      {activeTab !== "gov" && <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <LeafletMap
          nurseries={activeTab === "nursery" ? nurseries : []}
          clinics={activeTab === "clinic" ? filteredClinics : []}
          center={defaultCenter}
          zoom={municipality.default_zoom}
          userLocation={userLocation}
          selectedNurseryId={selectedNurseryId}
          onNurseryClick={setSelectedNurseryId}
          className="h-[250px]"
        />
      </div>}

      {/* 移動手段セレクター */}
      {userLocation && <TransportSelector selected={transportMode} onChange={setTransportMode} />}

      {/* 保育施設タブ */}
      {activeTab === "nursery" && (
        <div>
          {/* 年齢フィルター */}
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedAge(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedAge === null
                    ? "bg-[#2d9e6b] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                すべて ({nurseries.length})
              </button>
              {[0, 1, 2, 3, 4, 5].map((age) => {
                const ageKey = `age_${age}` as keyof typeof nurseries[0]["availability"];
                const count = nurseries.filter((n) => {
                  const s = n.availability[ageKey];
                  return s === "○" || s === "△";
                }).length;
                return (
                  <button
                    key={age}
                    onClick={() => setSelectedAge(age === selectedAge ? null : age)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedAge === age
                        ? "bg-[#2d9e6b] text-white shadow-sm"
                        : count > 0
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {age}歳 ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900">
              {userLocation ? "🏆 近い順ランキング" : "📋 保育施設一覧"}
              {selectedAge !== null && (
                <span className="ml-1 text-[#2d9e6b]">· {selectedAge}歳の空きあり</span>
              )}
            </h3>
            <span className="text-xs text-gray-400">{filteredNurseries.length}件</span>
          </div>

          {filteredNurseries.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {selectedAge}歳の空きがある施設は現在ありません
            </div>
          ) : (
            <div className="space-y-3">
              {userLocation && rankedNurseries ? (
                rankedNurseries.map((nursery, index) => (
                  <NurseryCard
                    key={nursery.id}
                    nursery={nursery}
                    rank={index + 1}
                    municipalityId={municipality.id}
                    transportMode={transportMode}
                  />
                ))
              ) : (
                filteredNurseries.map((nursery, index) => {
                  const withDistance = {
                    ...nursery,
                    distance_km: 0,
                    distance_text: "−",
                    walk_minutes: 0,
                    bike_minutes: 0,
                    car_minutes: 0,
                  };
                  return (
                    <NurseryCard
                      key={nursery.id}
                      nursery={withDistance}
                      rank={index + 1}
                      municipalityId={municipality.id}
                      transportMode={transportMode}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* 医療機関タブ */}
      {activeTab === "clinic" && (
        <div>
          {/* 診療科フィルター */}
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedDepartment(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  !selectedDepartment
                    ? "bg-[#e05a2b] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                すべて ({clinics.length})
              </button>
              {availableDepartments.map((dept) => {
                const count = clinics.filter((c) =>
                  c.departments.includes(dept)
                ).length;
                const isPriority = FILTER_PRIORITY_DEPTS.includes(dept);
                return (
                  <button
                    key={dept}
                    onClick={() =>
                      setSelectedDepartment(
                        dept === selectedDepartment ? null : dept
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedDepartment === dept
                        ? "bg-[#e05a2b] text-white shadow-sm"
                        : isPriority
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {dept} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900">
              {userLocation ? "🏆 近い順ランキング" : "📋 医療機関一覧"}
              {selectedDepartment && (
                <span className="ml-1 text-[#e05a2b]">· {selectedDepartment}</span>
              )}
            </h3>
            <span className="text-xs text-gray-400">{filteredClinics.length}件</span>
          </div>

          {filteredClinics.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {selectedDepartment}の医療機関は見つかりませんでした
            </div>
          ) : (
            <div className="space-y-3">
              {userLocation && rankedClinics ? (
                rankedClinics.map((clinic, index) => (
                  <ClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    rank={index + 1}
                    municipalityId={municipality.id}
                    transportMode={transportMode}
                  />
                ))
              ) : (
                filteredClinics.map((clinic, index) => {
                  const withDistance = {
                    ...clinic,
                    distance_km: 0,
                    distance_text: "−",
                    walk_minutes: 0,
                    bike_minutes: 0,
                    car_minutes: 0,
                  };
                  return (
                    <ClinicCard
                      key={clinic.id}
                      clinic={withDistance}
                      rank={index + 1}
                      municipalityId={municipality.id}
                      transportMode={transportMode}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* 行政サポートタブ */}
      {activeTab === "gov" && (
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 border border-blue-100">
            💡 タップすると詳細・申請方法・問い合わせ先が確認できます
          </div>
          {Array.from(govSupportsByCategory.entries()).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                <span>{category}</span>
                <span className="text-xs font-normal text-gray-400">({items.length}件)</span>
              </h3>
              <div className="space-y-2">
                {items.map((support) => (
                  <GovSupportCard
                    key={support.id}
                    support={support}
                    municipalityId={municipality.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 注意書き */}
      <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700 border border-yellow-200">
        <p className="font-semibold mb-1">⚠ ご注意</p>
        <ul className="space-y-1 text-yellow-600">
          <li>・ 距離は直線距離の概算です。</li>
          <li>・ 診療時間・休診日は変更されることがあります。受診前に各施設にご確認ください。</li>
          <li>・ 空き状況はデータ更新日時点のものです。</li>
        </ul>
      </div>

      {/* 問い合わせ先 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
        <p className="text-xs text-gray-500 mb-1">保育施設に関するお問い合わせ</p>
        <p className="text-sm font-semibold text-gray-700">
          {municipality.contact.department}
        </p>
        <a
          href={`tel:${municipality.contact.phone}`}
          className="inline-block mt-2 bg-[#f0faf5] text-[#2d9e6b] rounded-lg px-4 py-2 text-sm font-semibold"
        >
          📞 {municipality.contact.phone}
        </a>
      </div>
    </div>
  );
}

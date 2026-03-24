import { notFound } from "next/navigation";
import Link from "next/link";
import { dataRepository } from "@/lib/data/json-adapter";
import AvailabilityBadge from "@/components/nursery/AvailabilityBadge";
import NurseryDetailMap from "@/components/nursery/NurseryDetailMap";

interface NurseryDetailPageProps {
  params: Promise<{ municipality: string; nurseryId: string }>;
}

export async function generateStaticParams() {
  const municipalities = await dataRepository.getMunicipalities();
  const params: { municipality: string; nurseryId: string }[] = [];

  for (const m of municipalities) {
    const nurseries = await dataRepository.getNurseries(m.id);
    for (const n of nurseries) {
      params.push({ municipality: m.id, nurseryId: n.id });
    }
  }

  return params;
}

export default async function NurseryDetailPage({
  params,
}: NurseryDetailPageProps) {
  const { municipality: municipalityId, nurseryId } = await params;
  const nursery = await dataRepository.getNursery(municipalityId, nurseryId);
  const municipality = await dataRepository.getMunicipality(municipalityId);

  if (!nursery || !municipality) {
    notFound();
  }

  const ageLabels = [
    { key: "age_0" as const, label: "0歳児" },
    { key: "age_1" as const, label: "1歳児" },
    { key: "age_2" as const, label: "2歳児" },
    { key: "age_3" as const, label: "3歳児" },
    { key: "age_4" as const, label: "4歳児" },
    { key: "age_5" as const, label: "5歳児" },
  ];

  const occupancyRate = Math.round(
    (nursery.current_enrollment / nursery.capacity) * 100
  );

  return (
    <div className="p-4 space-y-4">
      {/* 戻るボタン */}
      <Link
        href={`/${municipalityId}`}
        className="inline-flex items-center gap-1 text-sm text-[#2d9e6b] font-medium hover:underline"
      >
        ← 一覧に戻る
      </Link>

      {/* 施設名ヘッダー */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{nursery.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                {nursery.type}
              </span>
              <span className="text-xs text-gray-500">
                {nursery.sub_area}地区
              </span>
            </div>
          </div>
        </div>

        {nursery.address && (
          <div className="mt-3 text-sm text-gray-600">
            📍 {nursery.address}
          </div>
        )}

        {nursery.tel && (
          <a
            href={`tel:${nursery.tel}`}
            className="inline-block mt-2 text-sm text-[#2d9e6b] font-medium"
          >
            📞 {nursery.tel}
          </a>
        )}
      </div>

      {/* 地図 */}
      {nursery.location && <NurseryDetailMap nursery={nursery} />}

      {/* 定員・在籍状況 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-3">定員・在籍状況</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {nursery.capacity}
            </div>
            <div className="text-xs text-gray-500">定員</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div
              className={`text-2xl font-bold ${
                nursery.current_enrollment > nursery.capacity
                  ? "text-red-500"
                  : "text-gray-900"
              }`}
            >
              {nursery.current_enrollment}
            </div>
            <div className="text-xs text-gray-500">在籍</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div
              className={`text-2xl font-bold ${
                occupancyRate > 100 ? "text-red-500" : "text-green-600"
              }`}
            >
              {occupancyRate}%
            </div>
            <div className="text-xs text-gray-500">充足率</div>
          </div>
        </div>
      </div>

      {/* 年齢別空き状況 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-3">
          年齢別 空き状況
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {ageLabels.map(({ key, label }) => {
            const status = nursery.availability[key];
            if (status === null || status === undefined) return null;
            return (
              <div key={key} className="text-center">
                <AvailabilityBadge status={status} ageLabel={label} size="md" />
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <p>○ 4人以上の空きあり ・ △ 1〜3人の空き ・ × 空きなし</p>
          <p>データ更新日: {nursery.data_date}</p>
        </div>
      </div>

      {/* 備考 */}
      {nursery.notes && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-2">備考</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {nursery.notes}
          </p>
        </div>
      )}

      {/* 出典 */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400">
        <p>出典: {nursery.data_source}</p>
        <p>データ取得日: {nursery.data_date}</p>
        {!nursery.geocoded && nursery.location && (
          <p className="text-yellow-500 mt-1">
            ※ 地図上の位置は概算です
          </p>
        )}
      </div>
    </div>
  );
}

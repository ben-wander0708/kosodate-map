import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { dataRepository } from "@/lib/data/json-adapter";
import ShareButton from "@/components/common/ShareButton";

interface ClinicDetailPageProps {
  params: Promise<{ municipality: string; clinicId: string }>;
}

export async function generateMetadata({ params }: ClinicDetailPageProps): Promise<Metadata> {
  const { municipality: municipalityId, clinicId } = await params;
  const clinic = await dataRepository.getClinic(municipalityId, clinicId);
  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!clinic || !municipality) return {};

  const deptText = clinic.departments.slice(0, 3).join("・");
  const ratingText = clinic.google_rating ? `評価${clinic.google_rating}点。` : "";

  return {
    title: `${clinic.name}｜${municipality.name_ja}の${clinic.facility_type}（${deptText}）`,
    description: `${municipality.prefecture_ja}${municipality.name_ja}にある${clinic.facility_type}「${clinic.name}」の診療科・診療時間・アクセス情報。${deptText}を診療。${ratingText}子育て世帯向け医療情報を掲載。`,
    keywords: [clinic.name, municipality.name_ja, municipality.prefecture_ja, ...clinic.departments, clinic.facility_type, "転入", "子育て"],
    openGraph: {
      title: `${clinic.name}｜${municipality.name_ja}の医療機関情報`,
      description: `${deptText}を診療。${municipality.name_ja}への転入を検討中の方向けに診療時間・アクセス情報を掲載。`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  const municipalities = await dataRepository.getMunicipalities();
  const params: { municipality: string; clinicId: string }[] = [];

  for (const m of municipalities) {
    const clinics = await dataRepository.getClinics(m.id);
    for (const c of clinics) {
      params.push({ municipality: m.id, clinicId: c.id });
    }
  }

  return params;
}

export default async function ClinicDetailPage({
  params,
}: ClinicDetailPageProps) {
  const { municipality: municipalityId, clinicId } = await params;
  const clinic = await dataRepository.getClinic(municipalityId, clinicId);

  if (!clinic) {
    notFound();
  }

  const PRIORITY_DEPARTMENTS = ["小児科", "産婦人科", "耳鼻いんこう科", "皮膚科"];

  return (
    <div className="p-4 space-y-4">
      {/* 戻るボタン */}
      <Link
        href={`/${municipalityId}`}
        className="inline-flex items-center gap-1 text-sm text-[#e05a2b] font-medium hover:underline"
      >
        ← 医療機関一覧に戻る
      </Link>

      {/* 施設名ヘッダー */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e05a2b] to-[#c0392b] text-white flex items-center justify-center text-xl flex-shrink-0">
            🏥
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{clinic.name}</h1>
            <div className="mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                {clinic.facility_type}
              </span>
            </div>
          </div>
        </div>

        {clinic.address && (
          <div className="mt-3 text-sm text-gray-600">
            📍 {clinic.address}
          </div>
        )}

        {clinic.tel && (
          <a
            href={`tel:${clinic.tel}`}
            className="inline-flex items-center gap-1 mt-2 bg-[#fff5f0] text-[#e05a2b] rounded-lg px-4 py-2 text-sm font-semibold"
          >
            📞 {clinic.tel}
          </a>
        )}

        {/* Google評価 */}
        {clinic.google_rating && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-base ${star <= Math.round(clinic.google_rating!) ? "text-yellow-400" : "text-gray-200"}`}
                >
                  ★
                </span>
              ))}
              <span className="ml-1 text-base font-bold text-gray-800">
                {clinic.google_rating}
              </span>
            </div>
            {clinic.google_review_count && (
              <span className="text-xs text-gray-400">
                ({clinic.google_review_count}件のクチコミ)
              </span>
            )}
            {clinic.google_place_id && (
              <a
                href={`https://www.google.com/maps/place/?q=place_id:${clinic.google_place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 underline ml-auto"
              >
                Googleマップで見る →
              </a>
            )}
          </div>
        )}
      </div>

      {/* 診療科目 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-3">診療科目</h2>
        <div className="flex flex-wrap gap-2">
          {clinic.departments.map((dept) => (
            <span
              key={dept}
              className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                PRIORITY_DEPARTMENTS.includes(dept)
                  ? "bg-orange-100 text-orange-700 border border-orange-200"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {PRIORITY_DEPARTMENTS.includes(dept) && "✓ "}
              {dept}
            </span>
          ))}
        </div>
        {clinic.departments.some((d) => PRIORITY_DEPARTMENTS.includes(d)) && (
          <p className="mt-2 text-xs text-orange-600">✓ 子育て世代に特に重要な診療科</p>
        )}
      </div>

      {/* 診療時間 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-3">診療時間</h2>
        <div className="space-y-2">
          {clinic.hours.weekday_morning && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">平日 午前</span>
              <span className="font-medium text-gray-900">{clinic.hours.weekday_morning}</span>
            </div>
          )}
          {clinic.hours.weekday_afternoon && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">平日 午後</span>
              <span className="font-medium text-gray-900">{clinic.hours.weekday_afternoon}</span>
            </div>
          )}
          {clinic.hours.saturday && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">土曜</span>
              <span className="font-medium text-gray-900">{clinic.hours.saturday}</span>
            </div>
          )}
          {!clinic.hours.saturday && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">土曜</span>
              <span className="text-gray-400">休診</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">日曜・祝日</span>
            <span className="text-gray-400">休診</span>
          </div>
        </div>

        {clinic.closed && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            休診日: {clinic.closed}
          </div>
        )}
      </div>

      {/* 備考 */}
      {clinic.notes && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-2">備考</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{clinic.notes}</p>
        </div>
      )}

      {/* 注意書き */}
      <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700 border border-yellow-200">
        <p className="font-semibold mb-1">⚠ ご注意</p>
        <p className="text-yellow-600">
          診療時間・休診日は変更されることがあります。受診前に必ず各施設にお電話でご確認ください。
        </p>
      </div>

      {/* LINEシェア */}
      <ShareButton
        title={`${clinic.name}｜医療機関情報`}
        url={`https://kosodate-map.vercel.app/${municipalityId}/clinics/${clinicId}`}
        message={`${clinic.departments.slice(0, 3).join("・")}。総社子育てノートで診療時間・アクセスを確認できます。`}
      />

      {/* 出典 */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400">
        <p>出典: 厚生労働省 医療情報ネット（ナビイ）</p>
      </div>
    </div>
  );
}

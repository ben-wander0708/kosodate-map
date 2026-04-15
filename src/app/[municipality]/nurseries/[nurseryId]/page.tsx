import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { dataRepository } from "@/lib/data/json-adapter";
import AvailabilityBadge from "@/components/nursery/AvailabilityBadge";
import NurseryDetailMap from "@/components/nursery/NurseryDetailMap";
import ShareButton from "@/components/common/ShareButton";

interface NurseryDetailPageProps {
  params: Promise<{ municipality: string; nurseryId: string }>;
}

export async function generateMetadata({ params }: NurseryDetailPageProps): Promise<Metadata> {
  const { municipality: municipalityId, nurseryId } = await params;
  const nursery = await dataRepository.getNursery(municipalityId, nurseryId);
  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!nursery || !municipality) return {};

  const hasAvailability = Object.values(nursery.availability).some((v) => v === "○" || v === "△");
  const availabilityText = hasAvailability ? "空きあり（要確認）" : "空き状況確認";

  return {
    title: `${nursery.name}｜${municipality.name_ja}の${nursery.type}情報`,
    description: `${municipality.prefecture_ja}${municipality.name_ja}にある${nursery.type}「${nursery.name}」の定員・空き状況・アクセス情報。定員${nursery.capacity}名、充足率${Math.round((nursery.current_enrollment / nursery.capacity) * 100)}%。${availabilityText}。`,
    keywords: [nursery.name, municipality.name_ja, municipality.prefecture_ja, nursery.type, "保育園", "空き状況", "転入", "保活"],
    openGraph: {
      title: `${nursery.name}｜${municipality.name_ja}の保育施設情報`,
      description: `定員${nursery.capacity}名・充足率${Math.round((nursery.current_enrollment / nursery.capacity) * 100)}%。${municipality.name_ja}への転入を検討中の方向けに空き状況・アクセス情報を掲載。`,
      type: "website",
    },
  };
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

// 施設タイプ別の転入者向け説明
const TYPE_TIPS: Record<string, string> = {
  "認可保育所": "市が運営・認可する保育所。保育料は収入に応じて決まります。入所は市への申請を通じて行います（直接申込不可）。",
  "認定こども園": "保育所と幼稚園の機能を合わせ持つ施設。1号認定（幼稚園利用）と2号・3号認定（保育所利用）があります。",
  "小規模保育": "0〜2歳専用の少人数施設（定員6〜19名）。3歳になると別の施設へ転園が必要です。",
  "事業所内保育": "企業が従業員向けに設置する保育施設。地域枠があれば外部の方も利用できますが、定員は非常に少数です。",
  "幼稚園": "主に3〜5歳対象の教育施設。保育時間は短め（通常14時頃まで）ですが、延長預かり保育を実施している園もあります。",
  "認可外保育施設": "認可外ですが行政に届出済み。認可施設に入れない場合の選択肢として機能します。保育料は施設によって異なります。",
};

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

  const occupancyColor =
    occupancyRate > 100
      ? "text-red-500"
      : occupancyRate >= 90
        ? "text-orange-500"
        : "text-green-600";

  const gaugeColor =
    occupancyRate > 100
      ? "bg-red-400"
      : occupancyRate >= 90
        ? "bg-orange-400"
        : "bg-green-400";

  const gaugeWidth = Math.min(occupancyRate, 100);

  const hasAvailability = Object.values(nursery.availability).some(
    (v) => v === "○" || v === "△"
  );

  const typeTip = TYPE_TIPS[nursery.type];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ChildCare",
    "name": nursery.name,
    "description": `${municipality.name_ja}の${nursery.type}。定員${nursery.capacity}名。`,
    "address": nursery.address ? {
      "@type": "PostalAddress",
      "streetAddress": nursery.address,
      "addressLocality": municipality.name_ja,
      "addressRegion": municipality.prefecture_ja,
      "addressCountry": "JP",
    } : undefined,
    "telephone": nursery.tel ?? undefined,
    "geo": nursery.location ? {
      "@type": "GeoCoordinates",
      "latitude": nursery.location.lat,
      "longitude": nursery.location.lng,
    } : undefined,
    "url": `https://kosodate-note.app/${municipalityId}/nurseries/${nurseryId}`,
  };

  return (
    <div className="p-4 space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

        {/* 開所時間 */}
        {nursery.hours.open && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
            <span>🕐 {nursery.hours.open}〜{nursery.hours.close}</span>
            {nursery.hours.extended_close && (
              <span>（延長〜{nursery.hours.extended_close}）</span>
            )}
          </div>
        )}

        {/* 給食・延長保育 */}
        {(nursery.school_lunch !== null || nursery.extended_care !== null) && (
          <div className="mt-2 flex gap-2">
            {nursery.school_lunch !== null && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${nursery.school_lunch ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {nursery.school_lunch ? "✓ 給食あり" : "✗ 給食なし"}
              </span>
            )}
            {nursery.extended_care !== null && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${nursery.extended_care ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {nursery.extended_care ? "✓ 延長保育あり" : "✗ 延長保育なし"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 地図 */}
      {nursery.location && <NurseryDetailMap nursery={nursery} />}

      {/* 競争率・充足率 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4">定員・競争率</h2>

        {/* 数値3列 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">
              {nursery.capacity}
            </div>
            <div className="text-xs text-gray-500">定員</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className={`text-2xl font-bold ${occupancyColor}`}>
              {nursery.current_enrollment}
            </div>
            <div className="text-xs text-gray-500">在籍</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className={`text-2xl font-bold ${occupancyColor}`}>
              {occupancyRate}%
            </div>
            <div className="text-xs text-gray-500">充足率</div>
          </div>
        </div>

        {/* 充足率ゲージ */}
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>0%</span>
          <span className="text-gray-600 font-medium">定員ライン 100%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 relative">
          <div
            className={`h-3 rounded-full transition-all ${gaugeColor}`}
            style={{ width: `${gaugeWidth}%` }}
          />
          {/* 100%マーカー */}
          <div className="absolute top-0 bottom-0 w-px bg-gray-400" style={{ left: "100%" }} />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {occupancyRate > 100
            ? `定員を${occupancyRate - 100}%超過しています。新規入所の空きは非常に限られます。`
            : occupancyRate >= 90
              ? "定員に近い状態です。空きがあっても枠は少数です。"
              : "定員に余裕があります。"}
        </p>
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

      {/* 転入者向けポイント */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <p className="text-sm font-bold text-amber-800 mb-2">⚠️ 転入を検討中の方へ</p>
        <ul className="text-xs text-amber-700 space-y-2">
          {hasAvailability ? (
            <>
              <li>・ 空きがある場合でも、転入者は「途中入所」として毎月審査があります。</li>
              <li>・ 入所希望月の前月中旬までに総社市こども夢づくり課へ申請が必要です。</li>
              <li>・ 空き状況はデータ更新日時点のものです。実際の空き状況は窓口でご確認ください。</li>
            </>
          ) : (
            <>
              <li>・ 現在、全年齢で空きがありません。ただし途中入所の申請は随時受け付けています。</li>
              <li>・ 申請を出しておくことで、空きが出た際に連絡が来る場合があります。</li>
              <li>・ 第1〜3希望まで施設を記入できます。複数の施設に申請しておくと入所できる可能性が高まります。</li>
            </>
          )}
          <li className="pt-1 border-t border-amber-200">
            📞 総社市こども夢づくり課：
            <a href="https://www.city.soja.okayama.jp/kodomo_yumedukuri/sisei_kodomo_yume/kodomo_yume.html"
              target="_blank" rel="noopener noreferrer"
              className="underline ml-1">公式サイトで確認する</a>
          </li>
        </ul>
      </div>

      {/* 申請書類診断への導線 */}
      <Link
        href={`/${municipalityId}/apply`}
        className="flex items-center justify-between bg-[#f0faf5] border border-[#c8ead8] rounded-xl p-4 active:scale-[0.99] transition-transform"
      >
        <div>
          <p className="text-sm font-bold text-[#2d7a5a]">📋 この施設への申請書類を確認する</p>
          <p className="text-xs text-[#2d9e6b] mt-0.5">3問に答えるだけで必要書類リストを作成</p>
        </div>
        <span className="text-[#2d9e6b] text-xl flex-shrink-0">›</span>
      </Link>

      {/* 施設タイプの説明 */}
      {typeTip && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs font-bold text-blue-700 mb-1">💡 {nursery.type}とは</p>
          <p className="text-xs text-blue-600 leading-relaxed">{typeTip}</p>
        </div>
      )}

      {/* 備考 */}
      {nursery.notes && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-2">施設メモ</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {nursery.notes}
          </p>
        </div>
      )}

      {/* LINEシェア */}
      <ShareButton
        title={`${nursery.name}｜${municipality.name_ja}の${nursery.type}`}
        url={`https://kosodate-note.app/${municipalityId}/nurseries/${nurseryId}`}
        message={`定員${nursery.capacity}名・${Object.values(nursery.availability).some(v => v === "○" || v === "△") ? "空きあり" : "空き状況確認"}。子育てノートで詳細を確認できます。`}
      />

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

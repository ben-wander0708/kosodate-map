import { dataRepository } from "@/lib/data/json-adapter";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import FaqAccordion from "./FaqAccordion";

interface FaqPageProps {
  params: Promise<{ municipality: string }>;
}

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { municipality: municipalityId } = await params;
  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!municipality) return {};
  const name = `${municipality.prefecture_ja}${municipality.name_ja}`;
  return {
    title: `よくある質問｜${name}の保育園・子育て情報｜こそだてマップ`,
    description: `${name}への転入前後に多い疑問をまとめました。保育園の申込み時期・必要書類・空き状況の見方など。`,
  };
}

export async function generateStaticParams() {
  const municipalities = await dataRepository.getMunicipalities();
  return municipalities.map((m) => ({ municipality: m.id }));
}

// FAQデータ（総社市向け）
const FAQ_ITEMS = [
  {
    question: "総社市に引越す前に保育園を探せますか？",
    answer: "こそだてマップでは住所が決まった段階から保育園の空き状況・場所・特徴を確認できます。入園申込みの手続きや必要書類・時期については、総社市教育委員会こども夢づくり課（0866-92-8265）に直接ご確認ください。"
  },
  {
    question: "保育園の空き状況の「○△×」はどういう意味ですか？",
    answer: "こそだてマップ上では、○は空きあり、△は若干空きあり（要確認）、×は空きなしを表しています。表示データは令和7年1月時点の情報をもとにしており、実際の空き状況とは異なる場合があります。最新情報は各保育園または市役所に直接ご確認ください。"
  },
  {
    question: "認可保育施設と認可外保育施設の違いは何ですか？",
    answer: "認可保育施設は国が定めた基準を満たした施設で、保育料は世帯収入に応じて市区町村が決定します。認可外保育施設は国の認可を受けていない施設で、保育料や運営方法は施設ごとに異なります。こそだてマップでは主に認可保育所・認定こども園・小規模保育の情報を掲載しています。"
  },
  {
    question: "転入後の保育園申込みはどこに相談すればいいですか？",
    answer: "総社市教育委員会こども夢づくり課が窓口です。申込み時期・必要書類・保育料の計算方法など、入園に関する正式な情報はすべて市役所にご確認ください。こそだてマップはあくまで施設の場所・特徴・空き状況を事前に把握するためのツールです。"
  },
  {
    question: "こそだてマップのデータはいつ更新されますか？",
    answer: "保育園の空き状況データは令和7年1月時点の情報をもとにしています。実際の空き状況は日々変化するため、最終確認は各保育園または総社市教育委員会（0866-92-8265）にお問い合わせください。"
  },
  {
    question: "こそだてマップに掲載されている行政支援の情報はどこから来ていますか？",
    answer: "総社市が公表している情報をもとに掲載しています。制度の詳細・受給条件・申請方法は変更される場合があります。実際の手続きは必ず市役所の担当窓口にご確認ください。このサイトの情報は参考目的であり、行政機関による正式な案内ではありません。"
  },
];

export default async function FaqPage({ params }: FaqPageProps) {
  const { municipality: municipalityId } = await params;
  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!municipality) notFound();

  const name = `${municipality.prefecture_ja}${municipality.name_ja}`;

  // AIが質問と回答を直接引用できるようにする構造化データ
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <div className="space-y-4 p-4 pb-32 overflow-y-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52] rounded-xl p-4 text-white">
        <h1 className="text-base font-bold mb-1">よくある質問</h1>
        <p className="text-xs text-green-200">{name}の保育園・子育て情報について</p>
      </div>

      {/* FAQ一覧 */}
      <FaqAccordion items={FAQ_ITEMS} />

      {/* 戻るリンク */}
      <div className="pt-2">
        <Link
          href={`/${municipalityId}`}
          className="block bg-white rounded-xl p-4 text-center text-sm text-[#2d9e6b] font-semibold border border-[#c8ead8] shadow-sm"
        >
          ← {name}の保育園マップに戻る
        </Link>
      </div>

      {/* お問い合わせ */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
        <p className="text-xs text-gray-500 mb-1">入園手続き・書類・時期など正式なご質問はこちらへ</p>
        <p className="text-sm font-semibold text-gray-700">{municipality.contact.department}</p>
        <a
          href={`tel:${municipality.contact.phone}`}
          className="inline-block mt-2 bg-[#f0faf5] text-[#2d9e6b] rounded-lg px-4 py-2 text-sm font-semibold"
        >
          📞 {municipality.contact.phone}
        </a>
      </div>

      {/* 免責事項 */}
      <div className="px-1">
        <p className="text-xs text-gray-400 leading-relaxed">
          ※ このページの情報は参考目的で掲載しています。掲載内容は公開情報をもとにしており、行政機関による正式な案内ではありません。制度の詳細・申請手続きは必ず各担当窓口にご確認ください。
        </p>
      </div>
    </div>
  );
}

import { dataRepository } from "@/lib/data/json-adapter";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

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
    answer: "はい、探せます。こそだてマップでは住所が決まった段階から保育園の空き状況・場所・特徴を確認できます。ただし、正式な入園申込みは総社市への転入届を提出し、住所が確定してからになります。"
  },
  {
    question: "総社市の保育園の入園申込みはいつ始まりますか？",
    answer: "4月入園を希望する場合、前年の10月〜11月頃に申込みが始まります。年度途中の入園は随時受付ていますが、空き状況によります。詳しくは総社市教育委員会こども夢づくり課（0866-92-8265）にお問い合わせください。"
  },
  {
    question: "保育園の空き状況の「○△×」はどういう意味ですか？",
    answer: "○は空きあり、△は若干空きあり（要確認）、×は空きなしを表しています。こそだてマップに表示されているデータは令和7年度の情報をもとにしていますが、実際の空き状況は変わることがあります。最新情報は各保育園または市役所にお問い合わせください。"
  },
  {
    question: "保育園に入るために必要な書類は何ですか？",
    answer: "主に①入園申込書、②就労証明書（働いている場合）、③健康保険証のコピーなどが必要です。ひとり親・障害などの状況によって追加書類が必要な場合があります。チェックリスト機能で転入後の手続きをまとめて確認できます。"
  },
  {
    question: "総社市は子育て支援が充実していますか？",
    answer: "総社市は児童手当・医療費助成・保育料補助などの子育て支援制度が整っています。こそだてマップの「行政支援」タブで、給付金・医療費助成・保育教育支援など14以上の制度を一覧で確認できます。"
  },
  {
    question: "認可保育園と認可外保育園の違いは何ですか？",
    answer: "認可保育園は国の基準を満たし市区町村が運営・管理する施設で、保育料は世帯収入に応じて決まります。認可外保育園（無認可保育園）は施設が独自に運営し、保育料は施設ごとに異なります。こそだてマップでは主に認可保育園・認定こども園・小規模保育の情報を掲載しています。"
  },
  {
    question: "転入後すぐに保育園に入れますか？",
    answer: "年度途中の入園は空き状況によります。4月入園が最も入りやすいタイミングですが、空き状況によっては年度途中でも入園できます。こそだてマップの空き状況（○△×）を参考に、早めに市役所へ相談することをおすすめします。"
  },
  {
    question: "こそだてマップのデータはいつ更新されますか？",
    answer: "保育園の空き状況データは令和7年1月時点の情報をもとにしています。実際の空き状況は日々変化するため、最終確認は各保育園または総社市教育委員会（0866-92-8265）にお問い合わせください。"
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
    <div className="space-y-4 p-4">
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
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => (
          <details
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <summary className="flex items-start gap-3 p-4 cursor-pointer list-none">
              <span className="text-[#2d9e6b] font-bold text-sm mt-0.5 shrink-0">Q</span>
              <span className="text-sm font-semibold text-gray-800 flex-1">{item.question}</span>
              <span className="text-gray-400 text-xs shrink-0 mt-0.5">▼</span>
            </summary>
            <div className="px-4 pb-4 flex gap-3">
              <span className="text-orange-500 font-bold text-sm shrink-0">A</span>
              <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
            </div>
          </details>
        ))}
      </div>

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
        <p className="text-xs text-gray-500 mb-1">その他のご質問は直接お問い合わせください</p>
        <p className="text-sm font-semibold text-gray-700">{municipality.contact.department}</p>
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

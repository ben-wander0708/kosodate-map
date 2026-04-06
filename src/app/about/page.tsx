import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "このサービスについて｜総社子育てノート",
  description: "総社子育てノートの運営者情報・サービスの概要・お問い合わせ先をご案内します。",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* ヘッダー */}
        <div>
          <Link href="/" className="text-xs text-[#2d9e6b] hover:underline">
            ← トップに戻る
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-3">
            このサービスについて
          </h1>
        </div>

        {/* 作った理由 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">🏡 なぜ作ったか</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            第3子の保育園入園にあたって、転居前に保育施設の情報を調べようとしたとき、
            市のホームページだけでは全体像が掴めませんでした。
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            どこに空きがあるか、自宅からどれくらいか、
            入園後の手続きの流れは——こういった情報が一か所にまとまっていなかったのです。
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            同じ経験をする家族が少しでも減ればと思い、このサービスを作りました。
          </p>
        </section>

        {/* サービス概要 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">📋 サービス概要</h2>
          <ul className="space-y-2">
            {[
              "保育施設の空き状況・マップ（総社市）",
              "医療機関（小児科）マップ",
              "行政支援制度の一覧",
              "入園準備ナビ（パートナー共有機能付き）",
              "入園後のタイムライン",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-[#2d9e6b] flex-shrink-0 mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-4">
            ※ 現在は岡山県総社市のデータに対応しています。
          </p>
        </section>

        {/* データについて */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">📊 データについて</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            掲載情報は総社市が公開する行政データをもとに作成しています。
            情報は定期的に更新しますが、最新の状況は各窓口・施設に直接ご確認ください。
          </p>
          <p className="text-xs text-gray-400 mt-3">
            このサービスは行政機関による公式案内ではありません。
          </p>
        </section>

        {/* 運営者 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">🏢 運営者</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="text-gray-400 flex-shrink-0 w-16">屋号</dt>
              <dd className="text-gray-700 font-medium">goodtaste.inc</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-gray-400 flex-shrink-0 w-16">連絡先</dt>
              <dd>
                <a
                  href="mailto:goodtaste.soja@gmail.com"
                  className="text-[#2d9e6b] underline"
                >
                  goodtaste.soja@gmail.com
                </a>
              </dd>
            </div>
          </dl>
        </section>

        {/* フッター */}
        <div className="text-center space-y-2 pb-4">
          <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 underline">
              プライバシーポリシー
            </Link>
          </div>
          <p className="text-xs text-gray-400">&copy; 2026 総社子育てノート ｜ goodtaste.inc</p>
        </div>

      </div>
    </div>
  );
}

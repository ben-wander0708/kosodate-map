import { redirect } from "next/navigation";
import Link from "next/link";
import { dataRepository } from "@/lib/data/json-adapter";

export default async function HomePage() {
  const municipalities = await dataRepository.getMunicipalities();

  // 自治体が1件のみの場合は直接そのページへ
  if (municipalities.length === 1) {
    redirect(`/${municipalities[0].id}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0faf5] to-[#f7f9fc]">
      {/* ヒーロー */}
      <div className="bg-gradient-to-br from-[#2d9e6b] to-[#1a7a52] text-white px-6 pt-16 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
              🗺
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                こそだて<span className="text-green-200">マップ</span>
              </h1>
              <p className="text-green-200 text-xs">
                住む場所が決まったら、まずここへ
              </p>
            </div>
          </div>

          <p className="text-sm text-green-100 leading-relaxed">
            物件が決まってから、行政の窓口が開くまで——
            <br />
            その空白を、こそだてマップが埋めます。
            <br />
            <span className="text-green-300">転居前から保育園の空き状況・施設情報をひと目で。</span>
          </p>
        </div>
      </div>

      {/* エリア選択 */}
      <div className="max-w-lg mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">
            エリアを選んでください
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            引越し先（または現住所）の自治体を選んでください
          </p>

          <div className="space-y-3">
            {municipalities.map((m) => (
              <Link
                key={m.id}
                href={`/${m.id}`}
                className="block bg-gradient-to-r from-[#f0faf5] to-white border border-[#c8ead8] rounded-xl p-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <span className="font-bold text-gray-900 group-hover:text-[#2d9e6b] transition-colors">
                        {m.prefecture_ja} {m.name_ja}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 ml-7">
                      {m.features_enabled.nursery_map && "保活マップ"}
                      {m.features_enabled.clinic_search && " ・ 医療機関検索"}
                      {m.features_enabled.gov_support && " ・ 行政支援"}
                    </div>
                  </div>
                  <span className="text-gray-400 group-hover:text-[#4CAF82] transition-colors text-xl">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {municipalities.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              準備中のエリアはありません
            </div>
          )}
        </div>

        {/* 今後の展開 */}
        <div className="mt-6 bg-white/80 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400">
            今後、対応エリアを順次拡大していきます
          </p>
        </div>
      </div>

      {/* フッター */}
      <footer className="mt-12 pb-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
          <a href="/about" className="hover:text-gray-600 underline">このサービスについて</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-gray-600 underline">プライバシーポリシー</a>
        </div>
        <p className="text-xs text-gray-400">
          &copy; 2026 こそだてマップ ｜ 運営: goodtaste.inc
        </p>
      </footer>
    </div>
  );
}

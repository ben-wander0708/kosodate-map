import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜総社子育てノート",
  description: "総社子育てノートのプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* ヘッダー */}
        <div>
          <Link href="/about" className="text-xs text-[#2d9e6b] hover:underline">
            ← サービス概要に戻る
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-3">プライバシーポリシー</h1>
          <p className="text-xs text-gray-400 mt-1">最終更新: 2026年3月</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-gray-800 mb-2">1. 運営者</h2>
            <p>goodtaste.inc（以下「当社」）は、総社子育てノート（以下「本サービス」）を運営しています。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">2. 取得する情報</h2>
            <p className="mb-2">本サービスは、以下の情報を取得することがあります。</p>
            <ul className="space-y-1 pl-4">
              <li className="list-disc">セッションID（チェックリストの共有URL生成のために使用）</li>
              <li className="list-disc">匿名の利用ログ（ページ閲覧数・機能の使用状況）</li>
              <li className="list-disc">オンボーディングでの回答（転居フェーズ・就業状況・子どもの年齢等）</li>
            </ul>
            <p className="mt-3 text-gray-500 text-xs">
              ※ 上記はお客様の端末（ブラウザのlocalStorage）またはデータベースに保存されます。
              氏名・住所・メールアドレス等、個人を特定できる情報は収集していません。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">3. 取得しない情報</h2>
            <ul className="space-y-1 pl-4 text-gray-500">
              <li className="list-disc">氏名・住所・電話番号</li>
              <li className="list-disc">メールアドレス</li>
              <li className="list-disc">クレジットカード情報・金融情報</li>
              <li className="list-disc">位置情報（GPS）</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">4. 利用目的</h2>
            <ul className="space-y-1 pl-4">
              <li className="list-disc">本サービスの機能提供（チェックリスト共有・タイムライン表示等）</li>
              <li className="list-disc">サービスの改善・不具合の把握</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">5. 第三者への提供</h2>
            <p>取得した情報を、法令に基づく場合を除き、第三者に提供することはありません。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">6. 外部サービスの利用</h2>
            <p>
              本サービスはデータの保存にSupabase（米国）を利用しています。
              Supabaseのプライバシーポリシーは
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2d9e6b] underline ml-1"
              >
                supabase.com/privacy
              </a>
              をご確認ください。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">7. お問い合わせ</h2>
            <p>
              本ポリシーに関するご質問は
              <a
                href="mailto:goodtaste.soja@gmail.com"
                className="text-[#2d9e6b] underline ml-1"
              >
                goodtaste.soja@gmail.com
              </a>
              までご連絡ください。
            </p>
          </section>

        </div>

        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">&copy; 2026 総社子育てノート ｜ goodtaste.inc</p>
        </div>

      </div>
    </div>
  );
}

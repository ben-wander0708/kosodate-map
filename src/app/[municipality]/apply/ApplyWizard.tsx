"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ApplyWizardProps {
  municipalityId: string;
  municipalityName: string;
}

type WorkStatus = "both_working" | "single_parent" | "self_employed" | "not_working";
type Timing = "soon" | "april" | "undecided";
type ChildAge = "under3" | "over3";

interface Answers {
  workStatus: WorkStatus | null;
  timing: Timing | null;
  childAge: ChildAge | null;
}

interface DocItem {
  id: string;
  text: string;
  note?: string;
  important?: boolean;
}

function buildDocList(answers: Answers): { docs: DocItem[]; tips: string[] } {
  const docs: DocItem[] = [];
  const tips: string[] = [];

  // 全員共通
  docs.push({
    id: "doc_nintei",
    text: "支給認定申請書",
    note: "市役所窓口またはオンラインで入手・申請",
    important: true,
  });
  docs.push({
    id: "doc_moushikomi",
    text: "保育施設利用申込書",
    note: "市役所窓口またはオンラインで入手・申請",
    important: true,
  });
  docs.push({
    id: "doc_juusho",
    text: "転入証明書類（賃貸契約書 または 住民票）",
    note: "転入予定または転入済みを証明するもの",
  });
  docs.push({
    id: "doc_hoken",
    text: "子どもの健康保険証のコピー",
  });

  // 就労状況に応じた追加書類
  if (answers.workStatus === "both_working" || answers.workStatus === "single_parent") {
    docs.push({
      id: "doc_shuro",
      text: "就労証明書（各勤務先に記入依頼）",
      note: "様式は市役所 or 総社市ウェブサイトから入手。両親ともに就労中の場合は2枚必要",
      important: true,
    });
    tips.push("就労証明書は勤務先の記入に時間がかかる場合があります。申請の2〜3週間前には依頼しておきましょう。");
  }

  if (answers.workStatus === "self_employed") {
    docs.push({
      id: "doc_jiei",
      text: "就労証明書（自己作成）または確定申告書の写し",
      note: "自営業の場合は市に確認の上、様式に沿って自己申告",
      important: true,
    });
  }

  if (answers.workStatus === "not_working") {
    docs.push({
      id: "doc_kyushoku",
      text: "求職中申告書（求職中の場合）",
      note: "保育の必要性を証明するために必要。求職活動の状況を記入",
    });
    tips.push("専業主婦・主夫の場合、0〜2歳の保育施設は利用しにくい場合があります。3歳以上であれば幼稚園・認定こども園（1号認定）も選択肢です。");
  }

  // 入所時期に応じたtips
  if (answers.timing === "soon") {
    tips.push("途中入所の申請は「入所希望月の前月中旬まで」が目安です。毎月審査があるため、早めに窓口に相談することをお勧めします。");
    tips.push("申請窓口：総社市こども夢づくり課（総社市役所内）");
  }

  if (answers.timing === "april") {
    tips.push("4月入所（年度申込）は、前年の秋頃（10〜11月）に申込受付が始まります。募集開始を見逃さないよう、市の広報やウェブサイトをチェックしておきましょう。");
    tips.push("オンライン申請は入所希望月の前々月15日まで受付。書類申請は郵送または窓口持参。");
  }

  if (answers.timing === "undecided") {
    tips.push("時期が決まっていない場合でも、事前に窓口で相談しておくことをお勧めします。空き状況や申請のタイミングについてアドバイスをもらえます。");
  }

  // 年齢に応じたtips
  if (answers.childAge === "under3" && answers.workStatus !== "not_working") {
    tips.push("0〜2歳クラスは特に競争率が高い傾向があります。複数の施設を第1〜3希望として記入しておくと入所できる可能性が高まります。");
  }

  if (answers.childAge === "over3") {
    tips.push("3歳以上になると選べる施設の種類が増えます。認定こども園（1号認定）や幼稚園も選択肢に加えて検討してみてください。");
  }

  return { docs, tips };
}

const WORK_STATUS_OPTIONS: { value: WorkStatus; label: string; sub: string }[] = [
  { value: "both_working", label: "共働き", sub: "父・母ともに就労中" },
  { value: "single_parent", label: "ひとり親", sub: "就労中" },
  { value: "self_employed", label: "自営業・在宅ワーク", sub: "個人事業主・フリーランスなど" },
  { value: "not_working", label: "専業主婦・主夫 / 求職中", sub: "現在は就労していない" },
];

const TIMING_OPTIONS: { value: Timing; label: string; sub: string }[] = [
  { value: "soon", label: "今月〜3か月以内", sub: "途中入所（随時申請）" },
  { value: "april", label: "来年4月から", sub: "年度入所（秋頃に一括申込）" },
  { value: "undecided", label: "まだ決まっていない", sub: "情報収集中" },
];

const AGE_OPTIONS: { value: ChildAge; label: string; sub: string }[] = [
  { value: "under3", label: "0〜2歳", sub: "保育所・認定こども園（2・3号認定）" },
  { value: "over3", label: "3歳以上", sub: "保育所・幼稚園・こども園（1〜3号認定）" },
];

export default function ApplyWizard({ municipalityId, municipalityName }: ApplyWizardProps) {
  const [step, setStep] = useState(0); // 0=intro, 1=Q1, 2=Q2, 3=Q3, 4=result
  const [answers, setAnswers] = useState<Answers>({
    workStatus: null,
    timing: null,
    childAge: null,
  });
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [showTemplate, setShowTemplate] = useState(false);
  const storageKey = `apply_checked_${municipalityId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCheckedDocs(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const toggleDoc = (id: string) => {
    const next = { ...checkedDocs, [id]: !checkedDocs[id] };
    setCheckedDocs(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const resetWizard = () => {
    setStep(0);
    setAnswers({ workStatus: null, timing: null, childAge: null });
    setCheckedDocs({});
    setShowTemplate(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const { docs, tips } = step === 4 ? buildDocList(answers) : { docs: [], tips: [] };
  const checkedCount = docs.filter((d) => checkedDocs[d.id]).length;
  const needsShuroTemplate =
    answers.workStatus === "both_working" || answers.workStatus === "single_parent";

  return (
    <div className="p-4 space-y-4">
      {/* 戻るボタン */}
      <Link
        href={`/${municipalityId}`}
        className="inline-flex items-center gap-1 text-sm text-[#2d9e6b] font-medium hover:underline"
      >
        ← ホームに戻る
      </Link>

      {/* ヘッダー */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">📋 申請書類 かんたん診断</h1>
        <p className="text-xs text-gray-500 mt-1">
          3つの質問に答えるだけで、あなたに必要な書類と申請手順がわかります
        </p>
        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step > n ? "bg-[#2d9e6b] text-white" :
                step === n ? "bg-[#4CAF82] text-white" :
                "bg-gray-100 text-gray-400"
              }`}>
                {step > n ? "✓" : n}
              </div>
              {n < 3 && <div className={`w-6 h-0.5 ${step > n ? "bg-[#2d9e6b]" : "bg-gray-200"}`} />}
            </div>
          ))}
          {step === 4 && (
            <span className="ml-2 text-xs text-[#2d9e6b] font-semibold">完了</span>
          )}
        </div>
      </div>

      {/* イントロ */}
      {step === 0 && (
        <div className="space-y-3">
          <div className="bg-[#f0faf5] rounded-xl p-4 border border-[#c8ead8]">
            <p className="text-sm font-bold text-[#2d7a5a] mb-2">この診断でわかること</p>
            <ul className="text-sm text-[#2d7a5a] space-y-1.5">
              <li>✅ 申請に必要な書類リスト</li>
              <li>✅ 申請方法と締め切りの目安</li>
              <li>✅ 就労証明書の依頼文テンプレート（必要な場合）</li>
            </ul>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-xs text-amber-700">
              ⚠️ この診断は{municipalityName}への申請を想定しています。書類の詳細は必ず市役所窓口でご確認ください。
            </p>
          </div>
          <button
            onClick={() => setStep(1)}
            className="w-full bg-[#2d9e6b] text-white font-bold py-4 rounded-xl text-base"
          >
            診断スタート →
          </button>
        </div>
      )}

      {/* Q1: 就労状況 */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">質問 1 / 3</p>
            <p className="text-base font-bold text-gray-900">ご家庭の就労状況は？</p>
            <p className="text-xs text-gray-500 mt-1">申請に必要な書類が変わります</p>
          </div>
          <div className="space-y-2">
            {WORK_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setAnswers((a) => ({ ...a, workStatus: opt.value }));
                  setStep(2);
                }}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left hover:border-[#4CAF82] hover:shadow-md transition-all active:scale-[0.99]"
              >
                <p className="font-semibold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Q2: 希望入所時期 */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">質問 2 / 3</p>
            <p className="text-base font-bold text-gray-900">希望する入所時期は？</p>
            <p className="text-xs text-gray-500 mt-1">申請の締め切りと手順が変わります</p>
          </div>
          <div className="space-y-2">
            {TIMING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setAnswers((a) => ({ ...a, timing: opt.value }));
                  setStep(3);
                }}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left hover:border-[#4CAF82] hover:shadow-md transition-all active:scale-[0.99]"
              >
                <p className="font-semibold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(1)}
            className="text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            ← 前の質問に戻る
          </button>
        </div>
      )}

      {/* Q3: 子どもの年齢 */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">質問 3 / 3</p>
            <p className="text-base font-bold text-gray-900">お子さまの年齢は？</p>
            <p className="text-xs text-gray-500 mt-1">選べる施設の種類が変わります</p>
          </div>
          <div className="space-y-2">
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setAnswers((a) => ({ ...a, childAge: opt.value }));
                  setStep(4);
                }}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left hover:border-[#4CAF82] hover:shadow-md transition-all active:scale-[0.99]"
              >
                <p className="font-semibold text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            className="text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            ← 前の質問に戻る
          </button>
        </div>
      )}

      {/* 結果 */}
      {step === 4 && (
        <div className="space-y-4">
          {/* 進捗サマリー */}
          <div className="bg-[#f0faf5] rounded-xl p-4 border border-[#c8ead8]">
            <p className="text-sm font-bold text-[#2d7a5a]">
              必要書類 {checkedCount} / {docs.length} 件 準備済み
            </p>
            <div className="w-full bg-[#c8ead8] rounded-full h-2 mt-2">
              <div
                className="bg-[#2d9e6b] h-2 rounded-full transition-all"
                style={{ width: `${docs.length > 0 ? (checkedCount / docs.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 書類チェックリスト */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 mb-3">必要書類リスト</h2>
            <div className="space-y-3">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className="w-full text-left flex items-start gap-3"
                >
                  <div className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all ${
                    checkedDocs[doc.id]
                      ? "bg-[#2d9e6b] border-[#2d9e6b]"
                      : doc.important
                        ? "border-orange-400"
                        : "border-gray-300"
                  }`}>
                    {checkedDocs[doc.id] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${checkedDocs[doc.id] ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {doc.important && !checkedDocs[doc.id] && (
                        <span className="text-orange-500 text-xs font-bold mr-1">必須</span>
                      )}
                      {doc.text}
                    </p>
                    {doc.note && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{doc.note}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ポイント・アドバイス */}
          {tips.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-sm font-bold text-amber-800 mb-2">⚠️ 申請のポイント</p>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="text-xs text-amber-700 leading-relaxed">
                    ・{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 就労証明書テンプレート */}
          {needsShuroTemplate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowTemplate(!showTemplate)}
                className="w-full p-4 text-left flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">📄 就労証明書 依頼文テンプレート</p>
                  <p className="text-xs text-gray-500 mt-0.5">勤務先の総務・人事担当者へのメール文面</p>
                </div>
                <span className="text-gray-400 text-lg">{showTemplate ? "▲" : "▼"}</span>
              </button>

              {showTemplate && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3 bg-gray-50 rounded-lg p-4 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
{`件名：保育施設入所申請に必要な就労証明書のご記入依頼

〇〇部 〇〇様

お世話になっております。[氏名] です。

このたび子どもの保育施設入所申請を行うにあたり、就労証明書の記入をお願いしたく、ご連絡いたしました。

【提出期限の目安】
申請希望月の前月中旬（途中入所の場合）

【書類について】
岡山県総社市所定の様式です。下記よりダウンロードいただくか、添付ファイルをご確認ください。
https://www.city.soja.okayama.jp/kodomo_yumedukuri/

【記入内容】
・就労形態・雇用区分
・1週あたりの就労日数・時間
・育児休業の取得状況　など

お忙しいところ大変恐縮ですが、ご対応いただけますと幸いです。
ご不明な点があればお気軽にご連絡ください。

[氏名]
[連絡先]`}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    ※ [ ] 内はご自身の情報に置き換えてください
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 窓口リンク */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm font-bold text-blue-700 mb-2">📞 申請窓口</p>
            <p className="text-xs text-blue-600 mb-2">総社市こども夢づくり課（総社市役所内）</p>
            <a
              href="https://www.city.soja.okayama.jp/kodomo_yumedukuri/sisei_kodomo_yume/kodomo_yume.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-blue-600 underline"
            >
              公式サイトで詳細を確認する →
            </a>
          </div>

          {/* 保活マップへのリンク */}
          <div className="bg-[#f0faf5] rounded-xl p-4 border border-[#c8ead8]">
            <p className="text-sm font-bold text-[#2d7a5a] mb-1">施設を探しますか？</p>
            <p className="text-xs text-[#2d7a5a] mb-3">空き状況・距離・充足率で施設を比較できます</p>
            <Link
              href={`/${municipalityId}?tab=nursery`}
              className="inline-block bg-[#2d9e6b] text-white text-sm font-bold px-4 py-2 rounded-lg"
            >
              保活マップを見る →
            </Link>
          </div>

          {/* やり直し */}
          <button
            onClick={resetWizard}
            className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl"
          >
            最初からやり直す
          </button>
        </div>
      )}
    </div>
  );
}

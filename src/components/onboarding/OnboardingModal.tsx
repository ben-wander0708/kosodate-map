"use client";

import { useState, useEffect } from "react";
import { track } from "@/lib/analytics/tracker";

// 他コンポーネントから参照できるようエクスポート
export const ONBOARDING_DONE_KEY = "kosodate_onboarding_v1";

type MoveIntent = "3ヶ月以内" | "半年以内" | "1年以内" | "resident";
type ChildAgeGroup = "0-1歳" | "2-3歳" | "4-5歳" | "5歳以上";
type WorkStatus = "fulltime" | "parttime" | "leave";

interface OnboardingAnswers {
  move_intent?: MoveIntent;
  child_age_group?: ChildAgeGroup;
  work_status?: WorkStatus;
}

interface OnboardingModalProps {
  municipalityName: string;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | "done";

export default function OnboardingModal({
  municipalityName,
  onClose,
}: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  // マウント後にスライドインアニメーション開始
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  // ===================================
  // 各ステップの回答ハンドラ
  // ===================================

  const handleMoveIntent = (value: MoveIntent) => {
    const next = { ...answers, move_intent: value };
    setAnswers(next);
    track("onboarding_step", { step: "move_intent", value_category: value });
    setStep(2);
  };

  const handleChildAge = (value: ChildAgeGroup) => {
    const next = { ...answers, child_age_group: value };
    setAnswers(next);
    track("onboarding_step", { step: "child_age", value_category: value });
    setStep(3);
  };

  const handleWorkStatus = (value: WorkStatus) => {
    const next = { ...answers, work_status: value };
    setAnswers(next);
    track("onboarding_step", { step: "work_status", value_category: value });
    try {
      localStorage.setItem(
        ONBOARDING_DONE_KEY,
        JSON.stringify({ done: true, answers: next })
      );
    } catch {}
    setStep("done");
    // 完了メッセージを少し見せてから閉じる
    setTimeout(handleClose, 1400);
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(
        ONBOARDING_DONE_KEY,
        JSON.stringify({ done: true, skipped: true })
      );
    } catch {}
    handleClose();
  };

  const progressPercent = step === "done" ? 100 : (Number(step) / 3) * 100;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* バックドロップ */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* ボトムシート */}
      <div
        className={`relative w-full bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* ハンドルバー */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* ヘッダー */}
        <div className="px-5 pt-3 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {step !== "done" && (
                <p className="text-xs text-gray-400 mb-0.5">
                  ステップ {String(step)}/3
                </p>
              )}
              <h3 className="text-base font-bold text-gray-900">
                {step === 1 && `${municipalityName}との関係は？`}
                {step === 2 && "お子さんの年齢を教えてください"}
                {step === 3 && "就労状況を教えてください"}
                {step === "done" && "ありがとうございます 🎉"}
              </h3>
              {step === 1 && (
                <p className="text-xs text-gray-400 mt-1">
                  あなたに合った情報をお届けするために使います
                </p>
              )}
            </div>
            {step !== "done" && (
              <button
                onClick={handleSkip}
                className="text-xs text-gray-400 underline ml-3 mt-1 flex-shrink-0"
              >
                スキップ
              </button>
            )}
          </div>

          {/* プログレスバー */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div
              className="h-1.5 bg-[#2d9e6b] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-5 pb-10">
          {/* Step 1: 転居意向 */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "🚚 まもなく引越し予定",
                  value: "3ヶ月以内" as MoveIntent,
                  sub: "3ヶ月以内",
                },
                {
                  label: "🔍 引越しを検討中",
                  value: "半年以内" as MoveIntent,
                  sub: "時期は未定",
                },
                {
                  label: "🏡 すでに住んでいる",
                  value: "resident" as MoveIntent,
                  sub: "在住の方",
                },
                {
                  label: "📋 情報収集中",
                  value: "1年以内" as MoveIntent,
                  sub: "将来的に検討",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleMoveIntent(opt.value)}
                  className="text-left p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5] active:scale-95 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 子どもの年齢 */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "👶 0〜1歳", value: "0-1歳" as ChildAgeGroup },
                { label: "🧒 2〜3歳", value: "2-3歳" as ChildAgeGroup },
                { label: "🧒 4〜5歳", value: "4-5歳" as ChildAgeGroup },
                { label: "👦 就学前（6歳）", value: "5歳以上" as ChildAgeGroup },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleChildAge(opt.value)}
                  className="text-center p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5] active:scale-95 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: 就労状況 */}
          {step === 3 && (
            <div className="space-y-2">
              {[
                {
                  label: "💼 フルタイム勤務",
                  value: "fulltime" as WorkStatus,
                  sub: "保育標準時間（最長11時間）が必要",
                },
                {
                  label: "⏰ パート・時短勤務",
                  value: "parttime" as WorkStatus,
                  sub: "保育短時間（最長8時間）で対応可",
                },
                {
                  label: "🍼 育休中",
                  value: "leave" as WorkStatus,
                  sub: "復職後の入園を見越して調査中",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleWorkStatus(opt.value)}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5] active:scale-95 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎊</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {municipalityName}の子育て情報を
                <br />
                あなたに合わせて表示します
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

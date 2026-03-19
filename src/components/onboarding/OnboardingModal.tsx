"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics/tracker";

export const ONBOARDING_DONE_KEY = "kosodate_onboarding_v2";

type Phase = "decided" | "moving_soon" | "moved" | "exploring";
type WorkStatus = "fulltime" | "parttime" | "leave";
type ChildCount = "1人" | "2人" | "3人以上";
type ChildAgeGroup = "0-1歳" | "2-3歳" | "4-5歳" | "5歳以上";

interface OnboardingAnswers {
  phase?: Phase;
  work_status?: WorkStatus;
  child_count?: ChildCount;
  child_age_group?: ChildAgeGroup;
}

interface OnboardingModalProps {
  municipalityName: string;
  municipalityId: string;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | "done";

const PHASE_OPTIONS: { label: string; sub: string; value: Phase }[] = [
  { label: "🏠 物件が決まった", sub: "転居先が確定している", value: "decided" },
  { label: "🚚 もうすぐ引越し", sub: "1〜2ヶ月以内に引越し予定", value: "moving_soon" },
  { label: "✅ 引越し済み", sub: "すでに転入している", value: "moved" },
  { label: "🔍 まだ検討中", sub: "物件はまだ決まっていない", value: "exploring" },
];

const WORK_OPTIONS: { label: string; sub: string; value: WorkStatus }[] = [
  { label: "💼 フルタイム勤務", sub: "保育標準時間（最長11時間）が必要", value: "fulltime" },
  { label: "⏰ パート・時短勤務", sub: "保育短時間（最長8時間）で対応可", value: "parttime" },
  { label: "🍼 育休中", sub: "復職後の入園に向けて情報収集", value: "leave" },
];

const COUNT_OPTIONS: { label: string; sub: string; value: ChildCount }[] = [
  { label: "👶 1人", sub: "", value: "1人" },
  { label: "👶👶 2人", sub: "", value: "2人" },
  { label: "👶👶👶 3人以上", sub: "", value: "3人以上" },
];

const AGE_OPTIONS: { label: string; value: ChildAgeGroup }[] = [
  { label: "👶 0〜1歳", value: "0-1歳" },
  { label: "🧒 2〜3歳", value: "2-3歳" },
  { label: "🧒 4〜5歳", value: "4-5歳" },
  { label: "👦 就学前（6歳）", value: "5歳以上" },
];

function getCtaForPhase(phase: Phase | undefined, municipalityId: string): {
  message: string;
  buttonLabel: string;
  href: string;
} {
  switch (phase) {
    case "decided":
      return {
        message: "物件が決まったら、転居前にやることを確認しましょう。保育園の申込みは早めが肝心です。",
        buttonLabel: "転居前チェックリストを見る →",
        href: `/${municipalityId}/checklist`,
      };
    case "moving_soon":
      return {
        message: "引越しまでにやることと、転入後の手続きをまとめて確認できます。",
        buttonLabel: "チェックリストを確認する →",
        href: `/${municipalityId}/checklist`,
      };
    case "moved":
      return {
        message: "転入届の提出はお済みですか？保育施設の申込みも早めに。",
        buttonLabel: "保育施設の空きを確認する →",
        href: `/${municipalityId}`,
      };
    case "exploring":
    default:
      return {
        message: "気になるエリアの保育施設の空き状況や医療機関を先に確認しておきましょう。",
        buttonLabel: "保育施設マップを見る →",
        href: `/${municipalityId}`,
      };
  }
}

export default function OnboardingModal({
  municipalityName,
  municipalityId,
  onClose,
}: OnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handlePhase = (value: Phase) => {
    const next = { ...answers, phase: value };
    setAnswers(next);
    track("onboarding_step", { step: "phase", value_category: value });
    setStep(2);
  };

  const handleWorkStatus = (value: WorkStatus) => {
    const next = { ...answers, work_status: value };
    setAnswers(next);
    track("onboarding_step", { step: "work_status", value_category: value });
    setStep(3);
  };

  const handleChildCount = (value: ChildCount) => {
    const next = { ...answers, child_count: value };
    setAnswers(next);
    track("onboarding_step", { step: "child_count", value_category: value });
    setStep(4);
  };

  const handleChildAge = (value: ChildAgeGroup) => {
    const next = { ...answers, child_age_group: value };
    setAnswers(next);
    track("onboarding_step", { step: "child_age", value_category: value });
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, JSON.stringify({ done: true, answers: next }));
    } catch {}
    setStep("done");
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, JSON.stringify({ done: true, skipped: true }));
    } catch {}
    handleClose();
  };

  const handleCtaClick = (href: string) => {
    handleClose();
    router.push(href);
  };

  const progressPercent = step === "done" ? 100 : (Number(step) / 4) * 100;
  const cta = getCtaForPhase(answers.phase, municipalityId);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={handleSkip} aria-hidden="true" />

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
                <p className="text-xs text-gray-400 mb-0.5">ステップ {String(step)}/4</p>
              )}
              <h3 className="text-base font-bold text-gray-900">
                {step === 1 && "今の状況を教えてください"}
                {step === 2 && "就労状況を教えてください"}
                {step === 3 && "未就学児は何人いますか？"}
                {step === 4 && "末子の年齢を教えてください"}
                {step === "done" && "ありがとうございます 🎉"}
              </h3>
              {step === 1 && (
                <p className="text-xs text-gray-400 mt-1">
                  {municipalityName}への転居フェーズに合わせた情報をお届けします
                </p>
              )}
            </div>
            {step !== "done" && (
              <button onClick={handleSkip} className="text-xs text-gray-400 underline ml-3 mt-1 flex-shrink-0">
                スキップ
              </button>
            )}
          </div>

          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div
              className="h-1.5 bg-[#2d9e6b] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-5 pb-10">
          {/* Step 1: フェーズ */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-2">
              {PHASE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handlePhase(opt.value)}
                  className="text-left p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5] active:scale-95 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 就労状況 */}
          {step === 2 && (
            <div className="space-y-2">
              {WORK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleWorkStatus(opt.value)}
                  className="w-full text-left p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5] active:scale-95 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: 未就学児の人数 */}
          {step === 3 && (
            <div className="grid grid-cols-3 gap-2">
              {COUNT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleChildCount(opt.value)}
                  className="text-center p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5] active:scale-95 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: 末子の年齢 */}
          {step === 4 && (
            <div className="grid grid-cols-2 gap-2">
              {AGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleChildAge(opt.value)}
                  className="text-center p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5] active:scale-95 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                </button>
              ))}
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">{cta.message}</p>
              <button
                onClick={() => handleCtaClick(cta.href)}
                className="w-full bg-[#2d9e6b] text-white font-semibold text-sm py-3 rounded-xl active:scale-95 transition-all"
              >
                {cta.buttonLabel}
              </button>
              <button
                onClick={handleClose}
                className="w-full text-gray-400 text-xs underline text-center"
              >
                あとで見る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

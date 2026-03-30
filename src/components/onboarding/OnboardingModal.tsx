"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics/tracker";
import { ONBOARDING_DONE_EVENT } from "@/hooks/useOnboarding";

export const ONBOARDING_DONE_KEY = "kosodate_onboarding_v2";

type Phase = "decided" | "moving_soon" | "moved" | "exploring";
type WorkStatus = "fulltime" | "parttime" | "leave";
type ChildCount = "1人" | "2人" | "3人以上";

export type EnrollmentStatus = "seeking" | "enrolled" | "home";

export interface ChildInfo {
  age: number;
  enrollment_status: EnrollmentStatus;
}

export type FamilyType = "dual" | "stay_home" | "single" | "leave";

export interface OnboardingAnswers {
  phase?: Phase;
  work_status?: WorkStatus;
  family_type?: FamilyType;
  child_count?: ChildCount;
  children?: ChildInfo[];
  enrollment_month?: string; // "YYYY-MM"
  decision_date?: string;    // "YYYY-MM-DD"
  moving_date?: string;      // "YYYY-MM-DD"
}

interface OnboardingModalProps {
  municipalityName: string;
  municipalityId: string;
  onClose: () => void;
  /** wizard = 初回オンボーディング / settings = 設定変更 */
  mode?: "wizard" | "settings";
}

/** ウィザードのステップ（4ステップ） */
type WizardStep = 1 | 2 | 3 | 4 | "done";

function countToNumber(count: ChildCount): number {
  if (count === "1人") return 1;
  if (count === "2人") return 2;
  return 3;
}

const FAMILY_TYPE_OPTIONS: { value: FamilyType; label: string; sub: string }[] = [
  { value: "dual",       label: "👫 共働き",         sub: "両親ともに就労中（フルタイム・パートを含む）" },
  { value: "stay_home",  label: "🏠 専業主婦・主夫",  sub: "主に家庭で育児中・就労していない" },
  { value: "single",     label: "👤 ひとり親",        sub: "就労中・支援制度の活用も確認したい" },
  { value: "leave",      label: "🍼 育休中",          sub: "育休後に復職予定" },
];

const PHASE_OPTIONS: { label: string; sub: string; value: Phase }[] = [
  { label: "🏠 物件が決まった",  sub: "転居先が確定している",      value: "decided" },
  { label: "🚚 もうすぐ引越し",  sub: "1〜2ヶ月以内に引越し予定", value: "moving_soon" },
  { label: "✅ 引越し済み",      sub: "すでに転入している",        value: "moved" },
  { label: "🔍 まだ検討中",      sub: "物件はまだ決まっていない",  value: "exploring" },
];

const WORK_OPTIONS: { label: string; sub: string; value: WorkStatus }[] = [
  { label: "💼 フルタイム",    sub: "保育標準時間（最長11時間）",  value: "fulltime" },
  { label: "⏰ パート・時短",  sub: "保育短時間（最長8時間）",    value: "parttime" },
  { label: "🍼 育休中",        sub: "復職後の入園に向けて準備",   value: "leave" },
];

const COUNT_OPTIONS: { label: string; value: ChildCount }[] = [
  { label: "👶 1人",         value: "1人" },
  { label: "👶👶 2人",       value: "2人" },
  { label: "👶👶👶 3人以上", value: "3人以上" },
];

const AGE_OPTIONS = [0, 1, 2, 3, 4, 5];

const ENROLLMENT_OPTIONS: { value: EnrollmentStatus; label: string; sub: string; emoji: string }[] = [
  { value: "seeking",  label: "保活中",   sub: "今回入園を予定",     emoji: "🔍" },
  { value: "enrolled", label: "在籍中",   sub: "すでに通っている",   emoji: "✅" },
  { value: "home",     label: "家庭保育", sub: "まだ入園しない予定", emoji: "🏠" },
];

const CHILD_LABELS = ["第1子", "第2子", "第3子"];

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -3; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}
const MONTH_OPTIONS = getMonthOptions();

function getCtaForPhase(phase: Phase | undefined, municipalityId: string) {
  switch (phase) {
    case "decided":
      return { message: "物件が決まったら、転居前にやることを確認しましょう。", buttonLabel: "チェックリストを見る →", href: `/${municipalityId}/checklist` };
    case "moving_soon":
      return { message: "引越しまでにやることと転入後の手続きをまとめて確認できます。", buttonLabel: "チェックリストを確認する →", href: `/${municipalityId}/checklist` };
    case "moved":
      return { message: "転入届の提出はお済みですか？保育施設の申込みも早めに。", buttonLabel: "保育施設の空きを確認する →", href: `/${municipalityId}` };
    default:
      return { message: "気になるエリアの保育施設の空き状況を先に確認しておきましょう。", buttonLabel: "保育施設マップを見る →", href: `/${municipalityId}` };
  }
}

interface ChildDraft {
  age: number | null;
  enrollment_status: EnrollmentStatus | null;
}

/** localStorageから既存の回答を読み込む */
function loadExistingAnswers(): OnboardingAnswers {
  try {
    const raw = localStorage.getItem(ONBOARDING_DONE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return data.answers || {};
    }
  } catch {}
  return {};
}

function saveDone(finalAnswers: OnboardingAnswers) {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, JSON.stringify({ done: true, answers: finalAnswers }));
    window.dispatchEvent(new Event(ONBOARDING_DONE_EVENT));
  } catch {}
}

// ─────────────────────────────────────────────
// ウィザードモード（初回・3ステップ）
// ─────────────────────────────────────────────
function WizardView({
  municipalityName,
  municipalityId,
  onClose,
  initialAnswers,
}: {
  municipalityName: string;
  municipalityId: string;
  onClose: () => void;
  initialAnswers: OnboardingAnswers;
}) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers);
  const [childDrafts, setChildDrafts] = useState<ChildDraft[]>(() => {
    if (initialAnswers.children && initialAnswers.children.length > 0) {
      return initialAnswers.children.map((c) => ({ age: c.age, enrollment_status: c.enrollment_status }));
    }
    if (initialAnswers.child_count) {
      return Array(countToNumber(initialAnswers.child_count)).fill(null).map(() => ({ age: null, enrollment_status: null }));
    }
    return [];
  });

  useEffect(() => {
    if (answers.child_count && !initialAnswers.children) {
      const n = countToNumber(answers.child_count);
      setChildDrafts(Array(n).fill(null).map(() => ({ age: null, enrollment_status: null })));
    }
  }, [answers.child_count, initialAnswers.children]);

  const handlePhase = (value: Phase) => {
    setAnswers((prev) => ({ ...prev, phase: value }));
    track("onboarding_step", { step: "phase", value_category: value });
    setStep(2);
  };

  const handleFamilyType = (value: FamilyType) => {
    setAnswers((prev) => ({ ...prev, family_type: value }));
    track("onboarding_step", { step: "family_type", value_category: value });
    setStep(3);
  };

  const handleChildCount = (value: ChildCount) => {
    const n = countToNumber(value);
    setAnswers((prev) => ({ ...prev, child_count: value }));
    setChildDrafts(Array(n).fill(null).map(() => ({ age: null, enrollment_status: null })));
    track("onboarding_step", { step: "child_count", value_category: value });
    setStep(4);
  };

  const handleChildAge = (index: number, age: number) => {
    setChildDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], age };
      return next;
    });
  };

  const handleEnrollmentStatus = (index: number, status: EnrollmentStatus) => {
    setChildDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], enrollment_status: status };
      return next;
    });
  };

  const handleChildrenDone = () => {
    const children: ChildInfo[] = childDrafts.map((d) => ({
      age: d.age ?? 0,
      enrollment_status: d.enrollment_status ?? "seeking",
    }));
    const next = { ...answers, children };
    track("onboarding_step", { step: "children", value_category: children.map((c) => `${c.age}歳/${c.enrollment_status}`).join(",") });
    saveDone(next);
    setStep("done");
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, JSON.stringify({ done: true, skipped: true }));
    } catch {}
    onClose();
  };

  const progressPercent = step === "done" ? 100 : (Number(step) / 4) * 100;
  const cta = getCtaForPhase(answers.phase, municipalityId);
  const allChildrenComplete = childDrafts.length > 0 && childDrafts.every((d) => d.age !== null && d.enrollment_status !== null);

  return (
    <>
      {/* ヘッダー */}
      <div className="px-5 pt-3 pb-4 sticky top-5 bg-white z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            {step !== 1 && step !== "done" && (
              <button
                onClick={() => setStep((s) => (s === 4 ? 3 : s === 3 ? 2 : 1) as WizardStep)}
                className="text-gray-400 text-sm hover:text-gray-600 flex-shrink-0"
                aria-label="戻る"
              >
                ←
              </button>
            )}
            <div className="flex-1">
              {step !== "done" && (
                <p className="text-xs text-gray-400 mb-0.5">ステップ {String(step)}/4</p>
              )}
              <h3 className="text-base font-bold text-gray-900">
                {step === 1 && "今の状況を教えてください"}
                {step === 2 && "世帯の状況を教えてください"}
                {step === 3 && "未就学児は何人いますか？"}
                {step === 4 && "お子さんの情報を教えてください"}
                {step === "done" && "ありがとうございます 🎉"}
              </h3>
              {step === 1 && <p className="text-xs text-gray-400 mt-1">{municipalityName}への転居フェーズに合わせた情報をお届けします</p>}
              {step === 2 && <p className="text-xs text-gray-400 mt-1">チェックリストや書類案内がご状況に合わせて変わります</p>}
              {step === 4 && <p className="text-xs text-gray-400 mt-1">年齢と保育園の状況をそれぞれ教えてください</p>}
            </div>
          </div>
          {step !== "done" && (
            <button onClick={handleSkip} className="text-xs text-gray-400 underline ml-3 mt-1 flex-shrink-0">
              スキップ
            </button>
          )}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
          <div className="h-1.5 bg-[#2d9e6b] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
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
                className={`text-left p-3 rounded-xl border-2 transition-all active:scale-95 ${
                  answers.phase === opt.value
                    ? "border-[#2d9e6b] bg-[#f0faf5]"
                    : "border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5]"
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: 世帯の状況 */}
        {step === 2 && (
          <div className="space-y-2">
            {FAMILY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFamilyType(opt.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all active:scale-95 flex items-center justify-between gap-3 ${
                  answers.family_type === opt.value
                    ? "border-[#2d9e6b] bg-[#f0faf5]"
                    : "border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5]"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </div>
                <span className="text-gray-300 text-xl flex-shrink-0">›</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: 人数 */}
        {step === 3 && (
          <div className="grid grid-cols-3 gap-2">
            {COUNT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChildCount(opt.value)}
                className={`text-center p-4 rounded-xl border-2 transition-all active:scale-95 ${
                  answers.child_count === opt.value
                    ? "border-[#2d9e6b] bg-[#f0faf5]"
                    : "border-gray-200 bg-white hover:border-[#2d9e6b] hover:bg-[#f0faf5]"
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 4: 各子どもの情報 */}
        {step === 4 && (
          <div className="space-y-5">
            {childDrafts.map((draft, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs font-bold text-gray-600 mb-2">{CHILD_LABELS[index] ?? `第${index + 1}子`}</p>
                <p className="text-[11px] text-gray-400 mb-1.5">年齢</p>
                <div className="grid grid-cols-6 gap-1 mb-3">
                  {AGE_OPTIONS.map((age) => (
                    <button
                      key={age}
                      onClick={() => handleChildAge(index, age)}
                      className={`py-2 rounded-lg border-2 text-xs font-bold transition-all active:scale-95 ${
                        draft.age === age
                          ? "border-[#2d9e6b] bg-[#2d9e6b] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-[#2d9e6b]"
                      }`}
                    >
                      {age}歳
                    </button>
                  ))}
                </div>
                {draft.age !== null && (
                  <>
                    <p className="text-[11px] text-gray-400 mb-1.5">保育園の状況</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ENROLLMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleEnrollmentStatus(index, opt.value)}
                          className={`flex flex-col items-center py-2 px-1 rounded-lg border-2 text-center transition-all active:scale-95 ${
                            draft.enrollment_status === opt.value
                              ? "border-[#2d9e6b] bg-[#f0faf5]"
                              : "border-gray-200 bg-white hover:border-[#2d9e6b]"
                          }`}
                        >
                          <span className="text-base">{opt.emoji}</span>
                          <span className={`text-[11px] font-semibold mt-0.5 ${draft.enrollment_status === opt.value ? "text-[#2d9e6b]" : "text-gray-700"}`}>{opt.label}</span>
                          <span className="text-[9px] text-gray-400 leading-tight mt-0.5">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {draft.age !== null && draft.enrollment_status !== null && (
                  <p className="text-[11px] text-[#2d9e6b] font-semibold mt-2">
                    ✅ {draft.age}歳・{ENROLLMENT_OPTIONS.find((o) => o.value === draft.enrollment_status)?.label}
                  </p>
                )}
              </div>
            ))}
            <button
              onClick={handleChildrenDone}
              disabled={!allChildrenComplete}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                allChildrenComplete ? "bg-[#2d9e6b] text-white active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {allChildrenComplete ? "完了 →" : "全員の情報を入力してください"}
            </button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">{cta.message}</p>
            <button
              onClick={() => { onClose(); router.push(cta.href); }}
              className="w-full bg-[#2d9e6b] text-white font-semibold text-sm py-3 rounded-xl active:scale-95 transition-all"
            >
              {cta.buttonLabel}
            </button>
            <p className="text-center text-xs text-gray-400">
              入園月・引越し日などは<br />
              画面右上の <span className="font-semibold text-gray-500">✏️ 設定変更</span> からいつでも追加できます
            </p>
            <button onClick={onClose} className="w-full text-gray-400 text-xs underline text-center">
              あとで見る
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// 設定変更モード（全項目を一画面で編集）
// ─────────────────────────────────────────────
function SettingsView({
  onClose,
  initialAnswers,
}: {
  onClose: () => void;
  initialAnswers: OnboardingAnswers;
}) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers);
  const [childDrafts, setChildDrafts] = useState<ChildDraft[]>(() =>
    (initialAnswers.children || []).map((c) => ({ age: c.age, enrollment_status: c.enrollment_status }))
  );

  const handleChildCount = (value: ChildCount) => {
    const n = countToNumber(value);
    setAnswers((prev) => ({ ...prev, child_count: value }));
    const existing = (initialAnswers.children || []).slice(0, n);
    const newDrafts = [
      ...existing.map((c) => ({ age: c.age, enrollment_status: c.enrollment_status })),
      ...Array(Math.max(0, n - existing.length)).fill(null).map(() => ({ age: null, enrollment_status: null })),
    ];
    setChildDrafts(newDrafts);
  };

  const handleSave = () => {
    const children: ChildInfo[] = childDrafts.map((d) => ({
      age: d.age ?? 0,
      enrollment_status: d.enrollment_status ?? "seeking",
    }));
    saveDone({ ...answers, children });
    onClose();
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="px-5 pt-3 pb-4 sticky top-5 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">設定変更</h3>
          <button onClick={onClose} className="text-xs text-gray-400 underline">閉じる</button>
        </div>
      </div>

      <div className="px-5 pb-10 space-y-6 mt-4">
        {/* フェーズ */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">今の状況</p>
          <div className="grid grid-cols-2 gap-2">
            {PHASE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAnswers((prev) => ({ ...prev, phase: opt.value }))}
                className={`text-left p-3 rounded-xl border-2 transition-all active:scale-95 ${
                  answers.phase === opt.value ? "border-[#2d9e6b] bg-[#f0faf5]" : "border-gray-200 bg-white"
                }`}
              >
                <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 就労状況 */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">就労状況</p>
          <div className="space-y-1.5">
            {WORK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAnswers((prev) => ({ ...prev, work_status: opt.value }))}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-95 ${
                  answers.work_status === opt.value ? "border-[#2d9e6b] bg-[#f0faf5]" : "border-gray-200 bg-white"
                }`}
              >
                <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                <span className="text-xs text-gray-400 ml-2">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 子ども人数 */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">未就学児の人数</p>
          <div className="grid grid-cols-3 gap-2">
            {COUNT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChildCount(opt.value)}
                className={`text-center py-3 rounded-xl border-2 transition-all active:scale-95 ${
                  answers.child_count === opt.value ? "border-[#2d9e6b] bg-[#f0faf5]" : "border-gray-200 bg-white"
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 各子どもの情報 */}
        {childDrafts.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">お子さんの情報</p>
            <div className="space-y-4">
              {childDrafts.map((draft, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 mb-2">{CHILD_LABELS[index] ?? `第${index + 1}子`}</p>
                  <div className="grid grid-cols-6 gap-1 mb-2">
                    {AGE_OPTIONS.map((age) => (
                      <button
                        key={age}
                        onClick={() => setChildDrafts((prev) => { const next = [...prev]; next[index] = { ...next[index], age }; return next; })}
                        className={`py-2 rounded-lg border-2 text-xs font-bold transition-all ${
                          draft.age === age ? "border-[#2d9e6b] bg-[#2d9e6b] text-white" : "border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        {age}歳
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ENROLLMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setChildDrafts((prev) => { const next = [...prev]; next[index] = { ...next[index], enrollment_status: opt.value }; return next; })}
                        className={`flex flex-col items-center py-2 px-1 rounded-lg border-2 text-center transition-all ${
                          draft.enrollment_status === opt.value ? "border-[#2d9e6b] bg-[#f0faf5]" : "border-gray-200 bg-white"
                        }`}
                      >
                        <span className="text-sm">{opt.emoji}</span>
                        <span className={`text-[10px] font-semibold mt-0.5 ${draft.enrollment_status === opt.value ? "text-[#2d9e6b]" : "text-gray-700"}`}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 入園月 */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">入園月（任意）</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAnswers((prev) => ({ ...prev, enrollment_month: opt.value }))}
                className={`py-2 px-1 rounded-xl border-2 text-xs font-semibold text-center transition-all active:scale-95 ${
                  answers.enrollment_month === opt.value ? "border-[#2d9e6b] bg-[#f0faf5] text-[#2d9e6b]" : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 引越し日程 */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">引越し日程（任意）</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">転居を決めた日</label>
              <input
                type="date"
                value={answers.decision_date || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, decision_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#4CAF82]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">引越し予定日</label>
              <input
                type="date"
                value={answers.moving_date || ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, moving_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-[#4CAF82]"
              />
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          className="w-full bg-[#2d9e6b] text-white font-semibold text-sm py-3.5 rounded-xl active:scale-95 transition-all"
        >
          保存する
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────
export default function OnboardingModal({
  municipalityName,
  municipalityId,
  onClose,
  mode = "wizard",
}: OnboardingModalProps) {
  const [visible, setVisible] = useState(false);
  const initialAnswers = loadExistingAnswers();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-end transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} aria-hidden="true" />
      <div className={`relative w-full bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 max-h-[90vh] overflow-y-auto ${visible ? "translate-y-0" : "translate-y-full"}`}>
        {/* ハンドルバー */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {mode === "settings" ? (
          <SettingsView onClose={handleClose} initialAnswers={initialAnswers} />
        ) : (
          <WizardView
            municipalityName={municipalityName}
            municipalityId={municipalityId}
            onClose={handleClose}
            initialAnswers={initialAnswers}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { ONBOARDING_DONE_KEY, type OnboardingAnswers, type FamilyType } from "@/components/onboarding/OnboardingModal";

interface UseOnboardingResult {
  answers: OnboardingAnswers | null;
  /** オンボーディングを完了 or スキップ済みか */
  isDone: boolean;
  isLoaded: boolean;
  /** 保活中（enrollment_status === "seeking"）の子どもがいるか */
  hasSeeking: boolean;
  /** 在籍中の子どもがいるか */
  hasEnrolled: boolean;
  /** 複数の未就学児がいるか */
  isMultiChild: boolean;
  /** 育休中か */
  isOnLeave: boolean;
  /** 入園月（"YYYY-MM" 形式）。未設定なら null */
  enrollmentMonth: string | null;
  /** 転居決定日（"YYYY-MM-DD"）。未設定なら null */
  decisionDate: string | null;
  /** 引越し予定日（"YYYY-MM-DD"）。未設定なら null */
  movingDate: string | null;
  /**
   * work_status から推奨ペルソナIDを返す
   * dual-income / stay-at-home / single-parent
   */
  suggestedPersonaId: string | null;
  /** 中央データストアに部分更新する */
  updateAnswers: (partial: Partial<OnboardingAnswers>) => void;
}

export const ONBOARDING_DONE_EVENT = "kosodate_onboarding_done";

export function useOnboarding(): UseOnboardingResult {
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const readStorage = () => {
      try {
        const raw = localStorage.getItem(ONBOARDING_DONE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data?.done) setIsDone(true);
          if (data?.answers) setAnswers(data.answers);
        }
      } catch {}
      setIsLoaded(true);
    };

    readStorage();
    // 同タブでオンボーディングが完了したときに再読み込み
    window.addEventListener(ONBOARDING_DONE_EVENT, readStorage);
    return () => window.removeEventListener(ONBOARDING_DONE_EVENT, readStorage);
  }, []);

  const children = answers?.children ?? [];

  const hasSeeking  = children.some((c) => c.enrollment_status === "seeking");
  const hasEnrolled = children.some((c) => c.enrollment_status === "enrolled");
  const isMultiChild = (answers?.child_count === "2人" || answers?.child_count === "3人以上");
  const isOnLeave   = answers?.work_status === "leave";

  /** 中央データストアへの部分更新 */
  const updateAnswers = useCallback((partial: Partial<OnboardingAnswers>) => {
    try {
      const raw = localStorage.getItem(ONBOARDING_DONE_KEY);
      const current = raw ? JSON.parse(raw) : { done: true, answers: {} };
      const updated = {
        ...current,
        done: true,
        answers: { ...current.answers, ...partial },
      };
      localStorage.setItem(ONBOARDING_DONE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(ONBOARDING_DONE_EVENT));
    } catch {}
  }, []);

  // family_type（ウィザードで取得）→ チェックリストのペルソナIDに変換
  // family_type が未設定の場合は work_status にフォールバック
  const suggestedPersonaId: string | null = (() => {
    if (answers?.family_type) {
      const map: Record<FamilyType, string> = {
        dual:       "dual-income",
        stay_home:  "stay-at-home",
        single:     "single-parent",
        leave:      "dual-income",
      };
      return map[answers.family_type];
    }
    // fallback: 旧来の work_status から推定
    switch (answers?.work_status) {
      case "fulltime":
      case "parttime":
      case "leave":
        return "dual-income";
      default:
        return null;
    }
  })();

  return {
    answers,
    isDone,
    isLoaded,
    hasSeeking,
    hasEnrolled,
    isMultiChild,
    isOnLeave,
    enrollmentMonth: answers?.enrollment_month ?? null,
    decisionDate: answers?.decision_date ?? null,
    movingDate: answers?.moving_date ?? null,
    suggestedPersonaId,
    updateAnswers,
  };
}

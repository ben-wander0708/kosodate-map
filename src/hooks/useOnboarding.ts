"use client";

import { useState, useEffect } from "react";
import { ONBOARDING_DONE_KEY, type OnboardingAnswers } from "@/components/onboarding/OnboardingModal";

interface UseOnboardingResult {
  answers: OnboardingAnswers | null;
  isLoaded: boolean;
  /** 保活中（enrollment_status === "seeking"）の子どもがいるか */
  hasSeeking: boolean;
  /** 在籍中の子どもがいるか */
  hasEnrolled: boolean;
  /** 複数の未就学児がいるか */
  isMultiChild: boolean;
  /** 育休中か */
  isOnLeave: boolean;
  /**
   * work_status から推奨ペルソナIDを返す
   * dual-income / stay-at-home / single-parent
   */
  suggestedPersonaId: string | null;
}

export function useOnboarding(): UseOnboardingResult {
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_DONE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.answers) {
          setAnswers(data.answers);
        }
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  const children = answers?.children ?? [];

  const hasSeeking  = children.some((c) => c.enrollment_status === "seeking");
  const hasEnrolled = children.some((c) => c.enrollment_status === "enrolled");
  const isMultiChild = (answers?.child_count === "2人" || answers?.child_count === "3人以上");
  const isOnLeave   = answers?.work_status === "leave";

  // work_status → ペルソナID のマッピング
  // fulltime / parttime / leave → 共働き世帯として扱う
  // （専業主婦・ひとり親はオンボーディングでは取得していないため手動選択に委ねる）
  const suggestedPersonaId: string | null = (() => {
    if (!answers?.work_status) return null;
    switch (answers.work_status) {
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
    isLoaded,
    hasSeeking,
    hasEnrolled,
    isMultiChild,
    isOnLeave,
    suggestedPersonaId,
  };
}

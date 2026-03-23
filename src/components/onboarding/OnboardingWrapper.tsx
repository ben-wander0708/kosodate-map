"use client";

import { useState, useEffect } from "react";
import OnboardingModal, { ONBOARDING_DONE_KEY } from "@/components/onboarding/OnboardingModal";

interface OnboardingWrapperProps {
  children: React.ReactNode;
  municipalityId: string;
  municipalityName: string;
}

export const ONBOARDING_OPEN_EVENT = "kosodate_open_onboarding";

export default function OnboardingWrapper({
  children,
  municipalityId,
  municipalityName,
}: OnboardingWrapperProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_DONE_KEY);
      if (!done) {
        const t = setTimeout(() => setShowOnboarding(true), 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  // 「設定を変更する」ボタンからの再オープンイベントを受け取る
  useEffect(() => {
    const handler = () => setShowOnboarding(true);
    window.addEventListener(ONBOARDING_OPEN_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handler);
  }, []);

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingModal
          municipalityName={municipalityName}
          municipalityId={municipalityId}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}

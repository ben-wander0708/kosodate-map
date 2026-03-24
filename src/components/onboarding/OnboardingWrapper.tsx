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
  const [modalMode, setModalMode] = useState<"wizard" | "settings">("wizard");

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_DONE_KEY);
      if (!done) {
        const t = setTimeout(() => setShowOnboarding(true), 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  // ✏️ 設定変更ボタンからの再オープン：isDone の場合は設定変更モードで開く
  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem(ONBOARDING_DONE_KEY);
        const isDone = raw ? JSON.parse(raw)?.done === true : false;
        setModalMode(isDone ? "settings" : "wizard");
      } catch {
        setModalMode("wizard");
      }
      setShowOnboarding(true);
    };
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
          mode={modalMode}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </>
  );
}

"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import { initLiff, liff } from "@/lib/liff/liffClient";

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export interface LiffContextValue {
  isLiff: boolean;
  isLoggedIn: boolean;
  profile: LiffProfile | null;
  loading: boolean;
}

export const LiffContext = createContext<LiffContextValue>({
  isLiff: false,
  isLoggedIn: false,
  profile: null,
  loading: true,
});

export default function LiffProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<LiffContextValue>({
    isLiff: false,
    isLoggedIn: false,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setCtx((prev) => ({ ...prev, loading: false }));
      return;
    }

    initLiff()
      .then(async () => {
        const isInClient = liff.isInClient();
        const isLoggedIn = liff.isLoggedIn();

        let profile: LiffProfile | null = null;
        if (isLoggedIn || isInClient) {
          try {
            const p = await liff.getProfile();
            profile = {
              userId: p.userId,
              displayName: p.displayName,
              pictureUrl: p.pictureUrl,
            };
          } catch {
            // profile取得失敗は無視
          }
        }

        setCtx({
          isLiff: isInClient,
          isLoggedIn: isLoggedIn || isInClient,
          profile,
          loading: false,
        });
      })
      .catch(() => {
        setCtx((prev) => ({ ...prev, loading: false }));
      });
  }, []);

  return <LiffContext.Provider value={ctx}>{children}</LiffContext.Provider>;
}

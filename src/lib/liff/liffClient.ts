import liff from "@line/liff";

let initPromise: Promise<void> | null = null;

export function initLiff(): Promise<void> {
  if (initPromise) return initPromise;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return Promise.resolve();
  initPromise = liff.init({ liffId });
  return initPromise;
}

export { liff };

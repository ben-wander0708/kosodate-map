// ===================================
// イベントトラッカー
// - クライアントサイドでイベントを収集しバッチ送信
// - LINE LIFF / 通常ブラウザ の両方に対応
// - 送信失敗時はlocalStorageにバッファ
// ===================================

"use client";

import {
  type EventType,
  type TrackedEvent,
  type EventPropertiesMap,
  type Platform,
} from "./types";
import {
  toAnonymousId,
  getOrCreateSessionAnonymousId,
  getOrCreateSessionId,
  roundToMinute,
  toH3Index,
} from "./anonymize";

const BATCH_INTERVAL_MS = 5_000;  // 5秒ごとにバッチ送信
const BUFFER_KEY = "kosodate_event_buffer";
const FIRST_VISIT_KEY = "kosodate_first_visit";
const UTM_SESSION_KEY = "kosodate_utm";       // sessionStorageキー（タブを閉じると消える）
const MAX_BUFFER_SIZE = 50;

interface TrackerState {
  anonymousId: string | null;
  sessionId: string;
  platform: Platform;
  municipalityId: string;
  currentLat: number | null;
  currentLng: number | null;
  queue: TrackedEvent[];
  flushTimer: ReturnType<typeof setTimeout> | null;
}

let state: TrackerState | null = null;

/** トラッカーを初期化する（アプリ起動時に1回呼ぶ） */
export async function initTracker(options: {
  municipalityId: string;
  lineUserId?: string;       // LINEログイン済みの場合
  platform: Platform;
  currentLat?: number;
  currentLng?: number;
}) {
  if (typeof window === "undefined") return;

  const anonymousId = options.lineUserId
    ? await toAnonymousId(options.lineUserId)
    : getOrCreateSessionAnonymousId();

  state = {
    anonymousId,
    sessionId: getOrCreateSessionId(),
    platform: options.platform,
    municipalityId: options.municipalityId,
    currentLat: options.currentLat ?? null,
    currentLng: options.currentLng ?? null,
    queue: [],
    flushTimer: null,
  };

  // ページ離脱時に強制フラッシュ
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEvents();
  });
  window.addEventListener("pagehide", flushEvents);

  // UTM・リファラーを取得してセッション開始イベントを送信
  const utm = getOrSaveUtm();
  track("session_start", {
    is_first_visit: isFirstVisit(),
    days_since_first_visit: getDaysSinceFirstVisit(),
    referrer: getReferrerDomain(),
    user_agent_category: detectDevice(),
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
  });
}

/** ユーザーの現在地を更新（検索エリアとの差分で転居意向を判定するため） */
export function updateLocation(lat: number, lng: number) {
  if (!state) return;
  state.currentLat = lat;
  state.currentLng = lng;
}

/** イベントを記録する（メインAPI） */
export function track<T extends EventType>(
  eventType: T,
  properties: T extends keyof EventPropertiesMap ? EventPropertiesMap[T] : Record<string, unknown>
) {
  if (!state || typeof window === "undefined") return;

  const h3 =
    state.currentLat !== null && state.currentLng !== null
      ? toH3Index(state.currentLat, state.currentLng)
      : null;

  const event: TrackedEvent<T> = {
    event_type: eventType,
    session_id: state.sessionId,
    occurred_at: roundToMinute(),
    geo_h3_r8: h3,
    municipality_id: state.municipalityId,
    platform: state.platform,
    properties,
  } as TrackedEvent<T>;

  state.queue.push(event as TrackedEvent);

  // バッファが溢れそうなら即時フラッシュ
  if (state.queue.length >= MAX_BUFFER_SIZE) {
    flushEvents();
    return;
  }

  // タイマーが未設定なら開始
  if (!state.flushTimer) {
    state.flushTimer = setTimeout(flushEvents, BATCH_INTERVAL_MS);
  }
}

/** キューのイベントをAPIに送信 */
async function flushEvents() {
  if (!state || state.queue.length === 0) return;

  const events = [...state.queue];
  state.queue = [];
  if (state.flushTimer) {
    clearTimeout(state.flushTimer);
    state.flushTimer = null;
  }

  const payload = {
    anonymous_id: state.anonymousId,
    events,
  };

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // ページ離脱後も送信を継続
    });
  } catch {
    // 送信失敗 → localStorageにバッファ（次回起動時にリトライ）
    bufferToLocal(events);
  }
}

/** 失敗したイベントをlocalStorageに退避 */
function bufferToLocal(events: TrackedEvent[]) {
  try {
    const existing = JSON.parse(localStorage.getItem(BUFFER_KEY) ?? "[]");
    const merged = [...existing, ...events].slice(-MAX_BUFFER_SIZE);
    localStorage.setItem(BUFFER_KEY, JSON.stringify(merged));
  } catch {
    // localStorageが使えない環境では無視
  }
}

/** 起動時にバッファされたイベントをリトライ送信 */
export async function retryBufferedEvents(anonymousId: string) {
  if (typeof window === "undefined") return;
  try {
    const buffered = JSON.parse(localStorage.getItem(BUFFER_KEY) ?? "[]");
    if (buffered.length === 0) return;

    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymous_id: anonymousId, events: buffered }),
    });
    localStorage.removeItem(BUFFER_KEY);
  } catch {
    // リトライも失敗なら次回に持ち越し
  }
}

// ===================================
// 内部ユーティリティ
// ===================================

function isFirstVisit(): boolean {
  if (typeof window === "undefined") return false;
  const existing = localStorage.getItem(FIRST_VISIT_KEY);
  if (!existing) {
    localStorage.setItem(FIRST_VISIT_KEY, new Date().toISOString());
    return true;
  }
  return false;
}

function getDaysSinceFirstVisit(): number {
  if (typeof window === "undefined") return 0;
  const first = localStorage.getItem(FIRST_VISIT_KEY);
  if (!first) return 0;
  const diff = Date.now() - new Date(first).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function detectDevice(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

/** document.referrer からドメイン部分だけ取り出す */
function getReferrerDomain(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    const url = new URL(ref);
    // 自分自身のドメインは除外
    if (url.hostname === window.location.hostname) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * UTMパラメーターを取得する。
 * 優先順位: URLのクエリパラメーター > sessionStorage（タブ内の以前のページ）
 * URLにUTMがあればsessionStorageに保存して次のページでも引き継ぐ。
 */
function getOrSaveUtm(): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  const empty = { utm_source: null, utm_medium: null, utm_campaign: null };
  if (typeof window === "undefined") return empty;

  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    };

    // URLにUTMがあればsessionStorageに保存（ページ遷移後も保持）
    if (fromUrl.utm_source) {
      sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }

    // URLになければsessionStorageから復元（同タブ内の継続セッション）
    const saved = sessionStorage.getItem(UTM_SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // sessionStorageが使えない環境では無視
  }

  return empty;
}

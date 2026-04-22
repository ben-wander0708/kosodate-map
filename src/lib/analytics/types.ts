// ===================================
// こそだてマップ - イベントトラッキング型定義
// B2Bデータ製品（政策分析・出店計画）の原材料
// ===================================

/** 全イベント種別 */
export type EventType =
  | "search"              // 施設検索
  | "facility_view"       // 施設詳細閲覧
  | "facility_favorite"   // お気に入り登録/解除
  | "facility_contact"    // 施設へのアクション（電話・地図・サイト）
  | "subsidy_view"        // 補助金・行政制度閲覧
  | "municipality_compare" // 自治体比較
  | "onboarding_step"     // オンボーディング回答
  | "checklist_view"      // チェックリスト閲覧
  | "session_start";      // セッション開始

/** プラットフォーム */
export type Platform = "web" | "line_liff";

/** ベースイベント（全イベント共通フィールド） */
export interface BaseEvent {
  event_type: EventType;
  session_id: string;         // セッション単位のID（ランダムUUID）
  occurred_at: string;        // ISO 8601（分単位に丸め済み）
  geo_h3_r8: string | null;   // H3インデックス 解像度8（≈600m圏）
  municipality_id: string;    // 現在閲覧中の自治体コード
  platform: Platform;
}

// ===================================
// イベント別 properties
// ===================================

/** SEARCH: 施設検索 */
export interface SearchProperties {
  query: string | null;             // 検索ワード（空の場合はnull）
  facility_categories: string[];    // ['認可保育所', '小児科']
  age_filter_months: number | null; // フィルタした年齢（月齢）
  commute_mode: "walk" | "bike" | "car" | null;
  target_municipality_id: string;   // 検索対象自治体（現住所と異なる→転居意向シグナル）
  is_cross_municipality: boolean;   // 異自治体検索フラグ
  result_count: number;
}

/** FACILITY_VIEW: 施設閲覧 */
export interface FacilityViewProperties {
  facility_id: string;
  facility_type: string;
  view_duration_sec: number;        // 閲覧秒数（意欲の強さ）
  sections_viewed: string[];        // ['基本情報', '空き状況', '地図']
  came_from: "search" | "map_pin" | "list" | "favorite"; // 流入元
  visit_count: number;              // 同施設への累計閲覧回数
}

/** FACILITY_FAVORITE: お気に入り */
export interface FacilityFavoriteProperties {
  facility_id: string;
  facility_type: string;
  action: "add" | "remove";
  favorite_count: number;           // 現在のお気に入り総数
}

/** FACILITY_CONTACT: 施設へのアクション */
export interface FacilityContactProperties {
  facility_id: string;
  facility_type: string;
  action_type: "phone" | "map" | "website" | "apply_doc";
}

/** SUBSIDY_VIEW: 行政制度閲覧 */
export interface SubsidyViewProperties {
  subsidy_id: string;
  subsidy_category: string;         // '保育料補助' | '医療費助成' | ...
  target_municipality_id: string;   // 現住所と別→転居先候補シグナル
  is_cross_municipality: boolean;
  view_duration_sec: number;
}

/** MUNICIPALITY_COMPARE: 自治体比較 */
export interface MunicipalityCompareProperties {
  from_municipality_id: string;     // 現住所自治体（最初の自治体）
  to_municipality_id: string;       // 比較対象自治体
  compare_context: string;          // 'nursery' | 'subsidy' | 'clinic'
}

/** ONBOARDING_STEP: オンボーディング回答 */
export interface OnboardingStepProperties {
  step: string;                     // 'child_age' | 'move_intent' | 'work_status'
  value_category: string;           // 実値でなくカテゴリで保存（例: '0-1歳'）
}

/** CHECKLIST_VIEW: チェックリスト閲覧 */
export interface ChecklistViewProperties {
  persona: string;                  // 'dual-income' | 'stay-at-home' | 'single-parent'
  section_id: string | null;
}

/** SESSION_START: セッション開始 */
export interface SessionStartProperties {
  is_first_visit: boolean;
  days_since_first_visit: number;
  referrer: string | null;          // 流入元URL（ドメインのみ）
  user_agent_category: "mobile" | "tablet" | "desktop";
  utm_source: string | null;        // UTMパラメーター（例: line, twitter, flyer）
  utm_medium: string | null;        // UTMパラメーター（例: share, qr, social）
  utm_campaign: string | null;      // UTMパラメーター（例: 202504_soja_demo）
}

/** イベント種別とpropertiesのマッピング */
export interface EventPropertiesMap {
  search: SearchProperties;
  facility_view: FacilityViewProperties;
  facility_favorite: FacilityFavoriteProperties;
  facility_contact: FacilityContactProperties;
  subsidy_view: SubsidyViewProperties;
  municipality_compare: MunicipalityCompareProperties;
  onboarding_step: OnboardingStepProperties;
  checklist_view: ChecklistViewProperties;
  session_start: SessionStartProperties;
}

/** 型安全なイベントオブジェクト */
export type TrackedEvent<T extends EventType = EventType> = BaseEvent & {
  event_type: T;
  properties: T extends keyof EventPropertiesMap ? EventPropertiesMap[T] : Record<string, unknown>;
};

/** APIに送るペイロード */
export interface EventPayload {
  events: TrackedEvent[];
}

/** Supabaseのeventsテーブル行 */
export interface EventRow {
  id: string;
  anonymous_id: string;
  session_id: string;
  event_type: EventType;
  occurred_at: string;
  geo_h3_r8: string | null;
  municipality_id: string;
  platform: Platform;
  properties: Record<string, unknown>;
  created_at: string;
}

/** Supabaseのanonymous_usersテーブル行 */
export interface AnonymousUserRow {
  anonymous_id: string;
  first_seen_at: string;
  last_seen_at: string;
  municipality_id: string | null;    // 初回の自治体
  child_age_group: string | null;    // オンボーディング回答
  move_intent: string | null;        // '3ヶ月以内' | '半年以内' | '1年以内' | '未定'
  work_status: string | null;        // 'fulltime' | 'parttime' | 'leave'
  platform: Platform;
  session_count: number;
}

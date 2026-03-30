// ===================================
// こそだてマップ - 共通型定義
// ===================================

/** 自治体メタ情報 */
export interface Municipality {
  id: string;
  name_ja: string;
  name_en: string;
  prefecture_ja: string;
  prefecture_en: string;
  center_lat: number;
  center_lng: number;
  default_zoom: number;
  contact: {
    department: string;
    url?: string;
    phone?: string;
  };
  data_sources: DataSource[];
  features_enabled: {
    nursery_map: boolean;
    clinic_search: boolean;
    gov_support: boolean;
  };
}

export interface DataSource {
  type: string;
  source_name: string;
  source_date: string;
  source_url: string | null;
}

/** 保育施設の種別 */
export type NurseryType =
  | "認可保育所"
  | "認定こども園"
  | "小規模保育"
  | "事業所内保育"
  | "幼稚園"
  | "認可外保育施設";

/** 空き状況の記号 */
export type AvailabilityStatus = "○" | "△" | "×" | null;

/** 年齢別空き状況 */
export interface Availability {
  age_0: AvailabilityStatus;
  age_1: AvailabilityStatus;
  age_2: AvailabilityStatus;
  age_3: AvailabilityStatus;
  age_4: AvailabilityStatus;
  age_5: AvailabilityStatus;
}

/** 緯度経度 */
export interface Location {
  lat: number;
  lng: number;
}

/** 保育施設 */
export interface Nursery {
  id: string;
  municipality_id: string;
  name: string;
  type: NurseryType;
  sub_area: string;
  address: string | null;
  tel: string | null;
  capacity: number;
  current_enrollment: number;
  age_from_months: number | null;
  hours: {
    open: string | null;
    close: string | null;
    extended_close: string | null;
  };
  extended_care: boolean | null;
  school_lunch: boolean | null;
  availability: Availability;
  location: Location | null;
  geocoded: boolean;
  notes: string;
  data_source: string;
  data_date: string;
  last_updated: string;
}

/** 距離計算結果付きの保育施設（フロントエンド用） */
export interface NurseryWithDistance extends Nursery {
  distance_km: number;
  distance_text: string;
  walk_minutes: number;
  bike_minutes: number;
  car_minutes: number;
}

/** 医療機関の施設種別 */
export type ClinicFacilityType = "クリニック" | "病院";

/** 診療時間 */
export interface ClinicHours {
  weekday_morning: string | null;
  weekday_afternoon: string | null;
  saturday: string | null;
  sunday: string | null;
}

/** 医療機関 */
export interface Clinic {
  id: string;
  municipality_id: string;
  name: string;
  facility_type: ClinicFacilityType;
  address: string;
  tel: string | null;
  departments: string[];
  hours: ClinicHours;
  closed: string | null;
  notes: string | null;
  location: Location | null;
  geocoded: boolean;
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
}

/** 距離計算結果付きの医療機関（フロントエンド用） */
export interface ClinicWithDistance extends Clinic {
  distance_km: number;
  distance_text: string;
  walk_minutes: number;
  bike_minutes: number;
  car_minutes: number;
}

/** 行政サポートのカテゴリ */
export type GovSupportCategory =
  | "給付金・手当"
  | "医療費助成"
  | "保育・教育"
  | "産前産後"
  | "相談・支援"
  | "ひとり親支援"
  | "障害児支援";

/** 金額詳細の行 */
export interface AmountDetail {
  label: string;
  value: string;
}

/** 行政サポート制度 */
export interface GovSupport {
  id: string;
  municipality_id: string;
  category: GovSupportCategory;
  title: string;
  target: string;
  summary: string;
  amount: string | null;
  amount_detail: AmountDetail[];
  how_to_apply: string | null;
  no_application_needed: boolean;
  contact_name: string;
  contact_phone?: string | null;
  url: string | null;
  tags: string[];
}

/** 転入チェックリストのアイテム */
export interface ChecklistItem {
  id: string;
  text: string;
  deadline: string | null;
  days_from_moving: number | null;
  days_from_decision: number | null; // 転居決定日からの日数（転居前タスク用）
  urgency: "high" | "medium" | "low";
  note: string | null;
}

/** チェックリストのセクション */
export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

/** ペルソナ別チェックリスト */
export interface PersonaChecklist {
  id: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  sections: ChecklistSection[];
}

/** 自治体のチェックリスト全体 */
export interface MunicipalityChecklist {
  municipality_id: string;
  personas: PersonaChecklist[];
}

/** 生活インフラ：ショップカテゴリ */
export interface ShopCategory {
  id: string;
  label: string;
  icon: string;
}

/** ポイントシステム情報 */
export interface PointSystem {
  name: string;
  color: string;
  rate: string;
  redemption: string;
  special_days: string;
  app: string;
  card_required: boolean;
}

/** ペルソナ別おすすめ度 */
export interface PersonaFit {
  stars: number;
  reason: string;
}

/** ショップ情報 */
export interface Shop {
  id: string;
  name: string;
  category: string;
  chain: string;
  address: string;
  hours: string;
  closed: string;
  location: Location | null;
  geocoded: boolean;
  point_system: PointSystem;
  features: string[];
  persona_fit: Record<string, PersonaFit>;
  notes: string;
}

/** ペルソナ別ポイント戦略 */
export interface PointStrategy {
  persona: string;
  title: string;
  icon: string;
  tips: string[];
  recommended_combo: string;
}

/** 自治体のショップデータ全体 */
export interface MunicipalityShops {
  municipality_id: string;
  categories: ShopCategory[];
  shops: Shop[];
  point_strategy: PointStrategy[];
}

/** コミュニティリンクのカテゴリ */
export interface CommunityCategory {
  id: string;
  label: string;
  icon: string;
}

/** コミュニティリンク */
export interface CommunityLink {
  id: string;
  category: string;
  name: string;
  description: string;
  url: string | null;
  action_label: string;
  platform: string;
  platform_color: string;
  verified: boolean;
  address?: string;
  tel?: string;
  hours?: string;
  persona_tags: string[];
  persona_notes: Record<string, string>;
}

/** 自治体のコミュニティリンク全体 */
export interface MunicipalityCommunity {
  municipality_id: string;
  categories: CommunityCategory[];
  links: CommunityLink[];
}

// ===================================
// 入園後タイムライン
// ===================================

/** 担当者 */
export type EventAssignee = "mother" | "father" | "both" | null;

/** 入園後イベントのカテゴリ */
export type PostEnrollmentCategory =
  | "慣らし保育"
  | "行事・発表"
  | "園との関わり"
  | "書類・手続き"
  | "健康・緊急対応"
  | "復職準備";

/** 入園後イベント（テンプレート） */
export interface PostEnrollmentEvent {
  id: string;
  category: PostEnrollmentCategory;
  title: string;
  note: string | null;
  /** 入園月を0としたときの相対月数（0=入園月、1=翌月…） */
  month_offset: number;
  /** 複数子がいる場合の注意書き */
  multi_child_note: string | null;
  /** 育休中の場合にのみ表示 */
  for_leave_only?: boolean;
  /** trueのとき通常カードではなくマイルストーンカードで表示 */
  is_milestone?: boolean;
}

/** 入園後タイムライン全体（テンプレート） */
export interface PostEnrollmentTimeline {
  events: PostEnrollmentEvent[];
}

/** 移動手段 */
export type TransportMode = "walk" | "bike" | "car";

/** 移動手段ごとの速度 (km/h) */
export const TRANSPORT_SPEEDS: Record<TransportMode, number> = {
  walk: 4.5,
  bike: 12,
  car: 30,
};

// ===================================
// お譲り (Giveaway) 機能
// ===================================

export type GiveawayCategory = "kids_clothes" | "toys" | "baby_goods";

export const GIVEAWAY_CATEGORY_LABELS: Record<GiveawayCategory, { icon: string; label: string }> = {
  kids_clothes: { icon: "👕", label: "子ども服" },
  toys:         { icon: "🧸", label: "おもちゃ" },
  baby_goods:   { icon: "🍼", label: "ベビー用品" },
};

export type GiveawayCondition = "new" | "good" | "fair";

export const GIVEAWAY_CONDITION_LABELS: Record<GiveawayCondition, string> = {
  new:  "新品・未使用",
  good: "目立った傷なし",
  fair: "使用感あり",
};

export const GIVEAWAY_AGE_RANGES = ["0-1歳", "2-3歳", "4-6歳", "小学生〜"] as const;

export interface GiveawayItem {
  id: string;
  municipalityId: string;
  lineUserId: string;
  displayName: string;
  title: string;
  description: string | null;
  category: GiveawayCategory;
  ageRange: string | null;
  condition: GiveawayCondition | null;
  imageUrl: string | null;
  facilityId: string | null;
  facilityName: string | null;
  status: "available" | "reserved" | "completed" | "cancelled";
  requestCount?: number;
  createdAt: string;
}

export interface GiveawayRequest {
  id: string;
  itemId: string;
  requesterLineUserId: string;
  requesterDisplayName: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

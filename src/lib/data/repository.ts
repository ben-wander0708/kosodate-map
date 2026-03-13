// ===================================
// データアクセス層 - インターフェース
// Phase 1: JSONファイルから読み込み
// Phase 2: Supabaseに切り替え可能
// ===================================

import type { Municipality, Nursery, Clinic, GovSupport, MunicipalityChecklist, MunicipalityShops, MunicipalityCommunity } from "./types";

export interface DataRepository {
  /** 全自治体の一覧を取得 */
  getMunicipalities(): Promise<Municipality[]>;

  /** 指定IDの自治体を取得 */
  getMunicipality(id: string): Promise<Municipality | null>;

  /** 指定自治体の保育施設一覧を取得 */
  getNurseries(municipalityId: string): Promise<Nursery[]>;

  /** 指定自治体の指定IDの保育施設を取得 */
  getNursery(
    municipalityId: string,
    nurseryId: string
  ): Promise<Nursery | null>;

  /** 指定自治体の医療機関一覧を取得 */
  getClinics(municipalityId: string): Promise<Clinic[]>;

  /** 指定自治体の指定IDの医療機関を取得 */
  getClinic(municipalityId: string, clinicId: string): Promise<Clinic | null>;

  /** 指定自治体の行政サポート一覧を取得 */
  getGovSupports(municipalityId: string): Promise<GovSupport[]>;

  /** 指定自治体の転入チェックリストを取得 */
  getChecklist(municipalityId: string): Promise<MunicipalityChecklist | null>;

  /** 指定自治体の生活インフラ（ショップ）情報を取得 */
  getShops(municipalityId: string): Promise<MunicipalityShops | null>;

  /** 指定自治体のコミュニティリンク集を取得 */
  getCommunity(municipalityId: string): Promise<MunicipalityCommunity | null>;

  /** 自治体IDが存在するか確認 */
  municipalityExists(id: string): Promise<boolean>;
}

// ===================================
// Phase 1: JSONファイルからデータを読み込むアダプター
// Phase 2でSupabaseに切り替える際は、このファイルを
// supabase-adapter.ts に差し替えるだけでOK
// ===================================

import fs from "fs/promises";
import path from "path";
import type { DataRepository } from "./repository";
import type { Municipality, Nursery, Clinic, GovSupport, MunicipalityChecklist, MunicipalityShops, MunicipalityCommunity, Park, Station } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "municipalities");

export class JsonDataRepository implements DataRepository {
  async getMunicipalities(): Promise<Municipality[]> {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const municipalities: Municipality[] = [];

    for (const entry of entries) {
      // _template やファイルはスキップ
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;

      try {
        const metaPath = path.join(DATA_DIR, entry.name, "meta.json");
        const raw = await fs.readFile(metaPath, "utf-8");
        municipalities.push(JSON.parse(raw));
      } catch {
        // meta.json が無いフォルダはスキップ
        continue;
      }
    }

    return municipalities;
  }

  async getMunicipality(id: string): Promise<Municipality | null> {
    try {
      const metaPath = path.join(DATA_DIR, id, "meta.json");
      const raw = await fs.readFile(metaPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async getNurseries(municipalityId: string): Promise<Nursery[]> {
    try {
      const filePath = path.join(
        DATA_DIR,
        municipalityId,
        "nurseries.json"
      );
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async getNursery(
    municipalityId: string,
    nurseryId: string
  ): Promise<Nursery | null> {
    const nurseries = await this.getNurseries(municipalityId);
    return nurseries.find((n) => n.id === nurseryId) ?? null;
  }

  async getClinics(municipalityId: string): Promise<Clinic[]> {
    try {
      const filePath = path.join(DATA_DIR, municipalityId, "clinics.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async getClinic(municipalityId: string, clinicId: string): Promise<Clinic | null> {
    const clinics = await this.getClinics(municipalityId);
    return clinics.find((c) => c.id === clinicId) ?? null;
  }

  async getGovSupports(municipalityId: string): Promise<GovSupport[]> {
    try {
      const filePath = path.join(DATA_DIR, municipalityId, "gov_support.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async getChecklist(municipalityId: string): Promise<MunicipalityChecklist | null> {
    try {
      const filePath = path.join(DATA_DIR, municipalityId, "checklist.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async getShops(municipalityId: string): Promise<MunicipalityShops | null> {
    try {
      const filePath = path.join(DATA_DIR, municipalityId, "shops.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async getCommunity(municipalityId: string): Promise<MunicipalityCommunity | null> {
    try {
      const filePath = path.join(DATA_DIR, municipalityId, "community.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async getParks(municipalityId: string): Promise<Park[]> {
    try {
      const filePath = path.join(DATA_DIR, municipalityId, "parks.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async getStations(municipalityId: string): Promise<Station[]> {
    try {
      const filePath = path.join(DATA_DIR, municipalityId, "stations.json");
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async municipalityExists(id: string): Promise<boolean> {
    try {
      const metaPath = path.join(DATA_DIR, id, "meta.json");
      await fs.access(metaPath);
      return true;
    } catch {
      return false;
    }
  }
}

// シングルトンインスタンス
// Phase 2で切り替える際はここを変更するだけ
export const dataRepository: DataRepository = new JsonDataRepository();

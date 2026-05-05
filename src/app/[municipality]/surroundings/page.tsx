import { dataRepository } from "@/lib/data/json-adapter";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SurroundingsClient from "./SurroundingsClient";

interface Props {
  params: Promise<{ municipality: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { municipality: municipalityId } = await params;
  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!municipality) return {};
  const { name_ja, prefecture_ja } = municipality;
  return {
    title: `${name_ja}の周辺環境マップ｜${name_ja}子育てノート`,
    description: `${prefecture_ja}${name_ja}の物件周辺にある保育施設・医療機関・スーパー・公園・駅を子育て目線で一括確認。住所を入力するだけで子育て環境スコアがわかります。`,
  };
}

export default async function SurroundingsPage({ params }: Props) {
  const { municipality: municipalityId } = await params;
  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!municipality) notFound();

  const [nurseries, clinics, shopsData, parks, stations, schools] = await Promise.all([
    dataRepository.getNurseries(municipalityId),
    dataRepository.getClinics(municipalityId),
    dataRepository.getShops(municipalityId),
    dataRepository.getParks(municipalityId),
    dataRepository.getStations(municipalityId),
    dataRepository.getSchools(municipalityId),
  ]);

  return (
    <SurroundingsClient
      municipalityId={municipalityId}
      municipalityName={municipality.name_ja}
      prefectureName={municipality.prefecture_ja}
      center={{ lat: municipality.center_lat, lng: municipality.center_lng }}
      defaultZoom={municipality.default_zoom}
      nurseries={nurseries}
      clinics={clinics}
      shops={shopsData?.shops ?? []}
      parks={parks}
      stations={stations}
      schools={schools}
    />
  );
}

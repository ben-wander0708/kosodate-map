import { dataRepository } from "@/lib/data/json-adapter";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import MunicipalityHome from "./MunicipalityHome";
import DashboardHome from "@/components/dashboard/DashboardHome";

interface MunicipalityPageProps {
  params: Promise<{ municipality: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: MunicipalityPageProps): Promise<Metadata> {
  const { municipality: municipalityId } = await params;
  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!municipality) return {};

  const nurseries = await dataRepository.getNurseries(municipalityId);
  const { name_ja, prefecture_ja } = municipality;

  const baseUrl = "https://kosodate-note.app";

  return {
    title: `${name_ja}の保育園・子育て情報｜${name_ja}子育てノート`,
    description: `${prefecture_ja}${name_ja}への転入前から保育園の空き状況・所要時間・子育て支援制度をひと目で確認。全${nurseries.length}件の保育施設情報を収録。住所が決まったその日から使えます。`,
    keywords: [name_ja, prefecture_ja, "保育園", "転居", "転入", "子育て", "空き状況", "保活", "引越し", "子育て支援"],
    openGraph: {
      title: `${name_ja}の保育園・子育て情報｜${name_ja}子育てノート`,
      description: `${prefecture_ja}${name_ja}への転入前から保育園情報・子育て支援をまとめて確認。全${nurseries.length}件の施設を掲載。`,
      type: "website",
      url: `${baseUrl}/${municipalityId}`,
      images: [
        {
          url: `${baseUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${name_ja}の子育て情報｜${name_ja}子育てノート`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name_ja}の保育園・子育て情報｜${name_ja}子育てノート`,
      description: `${prefecture_ja}${name_ja}への転入前から保育園情報・子育て支援をまとめて確認。全${nurseries.length}件の施設を掲載。`,
      images: [`${baseUrl}/opengraph-image`],
    },
  };
}

export default async function MunicipalityPage({
  params,
  searchParams,
}: MunicipalityPageProps) {
  const { municipality: municipalityId } = await params;
  const { tab } = await searchParams;

  const municipality = await dataRepository.getMunicipality(municipalityId);

  if (!municipality) {
    notFound();
  }

  // タブ指定がない場合はダッシュボードを表示
  if (!tab) {
    return (
      <DashboardHome
        municipalityId={municipalityId}
        municipalityName={municipality.name_ja}
      />
    );
  }

  const [nurseries, clinics, govSupports] = await Promise.all([
    dataRepository.getNurseries(municipalityId),
    dataRepository.getClinics(municipalityId),
    dataRepository.getGovSupports(municipalityId),
  ]);

  return (
    <Suspense>
      <MunicipalityHome
        municipality={municipality}
        nurseries={nurseries}
        clinics={clinics}
        govSupports={govSupports}
      />
    </Suspense>
  );
}

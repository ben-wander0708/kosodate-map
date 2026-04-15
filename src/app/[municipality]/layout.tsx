import { notFound } from "next/navigation";
import { dataRepository } from "@/lib/data/json-adapter";
import AppHeader from "@/components/layout/AppHeader";
import AnalyticsProvider from "@/components/providers/AnalyticsProvider";
import OnboardingWrapper from "@/components/onboarding/OnboardingWrapper";
import type { Metadata } from "next";

interface MunicipalityLayoutProps {
  children: React.ReactNode;
  params: Promise<{ municipality: string }>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ municipality: string }> }
): Promise<Metadata> {
  const { municipality: municipalityId } = await params;
  const municipality = await dataRepository.getMunicipality(municipalityId);

  if (!municipality) return {};

  const name = `${municipality.prefecture_ja}${municipality.name_ja}`;

  return {
    title: `${name}の子育て情報｜総社子育てノート`,
    description: `${name}への転入前から確認できる保育園の空き状況・施設マップ・入園手続きチェックリスト。住所確定後すぐに動ける。`,
    keywords: ["保育園", "引越し", "転居", "子育て", "空き状況", municipality.name_ja, municipality.prefecture_ja, "転入", "子育てノート"],
    openGraph: {
      title: `${name}の子育て情報｜総社子育てノート`,
      description: `${name}への転入前から使える保育園・子育て情報サービス。`,
      type: "website",
      url: `https://kosodate-map.vercel.app/${municipalityId}`,
      images: [
        {
          url: "https://kosodate-map.vercel.app/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${name}の子育て情報｜総社子育てノート`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}の子育て情報｜総社子育てノート`,
      description: `${name}への転入前から使える保育園・子育て情報サービス。`,
      images: ["https://kosodate-map.vercel.app/opengraph-image"],
    },
  };
}

export async function generateStaticParams() {
  const municipalities = await dataRepository.getMunicipalities();
  return municipalities.map((m) => ({ municipality: m.id }));
}

export default async function MunicipalityLayout({
  children,
  params,
}: MunicipalityLayoutProps) {
  const { municipality: municipalityId } = await params;
  const municipality = await dataRepository.getMunicipality(municipalityId);

  if (!municipality) {
    notFound();
  }

  const baseUrl = "https://kosodate-map.vercel.app";
  const municipalityUrl = `${baseUrl}/${municipalityId}`;

  // AIが「このサービスとは何か」を理解するための構造化データ
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "総社子育てノート",
    "url": baseUrl,
    "description": "引越し先の保育園の空き状況・子育て施設をまとめて確認できるサービス。住所が決まったその日から使えます。",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${baseUrl}/soja`,
      "query-input": "required name=municipality"
    }
  };

  const localGovSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${municipality.prefecture_ja}${municipality.name_ja}の保育園・子育て情報`,
    "url": municipalityUrl,
    "description": `${municipality.prefecture_ja}${municipality.name_ja}への転入前から確認できる保育園の空き状況・施設マップ・入園手続きチェックリスト。`,
    "about": {
      "@type": "City",
      "name": municipality.name_ja,
      "containedInPlace": {
        "@type": "State",
        "name": municipality.prefecture_ja
      }
    }
  };

  return (
    <AnalyticsProvider municipalityId={municipalityId}>
      <div className="min-h-screen bg-[#f7f9fc]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localGovSchema) }}
        />
        <AppHeader
          municipalityName={municipality.name_ja}
          municipalityId={municipalityId}
        />
        <OnboardingWrapper
          municipalityId={municipalityId}
          municipalityName={municipality.name_ja}
        >
          <main className="max-w-lg mx-auto">{children}</main>
        </OnboardingWrapper>
      </div>
    </AnalyticsProvider>
  );
}

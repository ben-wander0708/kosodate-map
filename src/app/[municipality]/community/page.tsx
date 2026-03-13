import { notFound } from "next/navigation";
import { dataRepository } from "@/lib/data/json-adapter";
import CommunityClient from "./CommunityClient";

interface CommunityPageProps {
  params: Promise<{ municipality: string }>;
}

export async function generateStaticParams() {
  const municipalities = await dataRepository.getMunicipalities();
  return municipalities.map((m) => ({ municipality: m.id }));
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { municipality: municipalityId } = await params;

  const [municipality, community] = await Promise.all([
    dataRepository.getMunicipality(municipalityId),
    dataRepository.getCommunity(municipalityId),
  ]);

  if (!municipality) notFound();
  if (!community) notFound();

  return (
    <CommunityClient
      community={community}
      municipalityName={municipality.name_ja}
    />
  );
}

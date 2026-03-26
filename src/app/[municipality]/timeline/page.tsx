import { notFound } from "next/navigation";
import { dataRepository } from "@/lib/data/json-adapter";
import TimelineClient from "./TimelineClient";

interface TimelinePageProps {
  params: Promise<{ municipality: string }>;
}

export async function generateStaticParams() {
  const municipalities = await dataRepository.getMunicipalities();
  return municipalities.map((m) => ({ municipality: m.id }));
}

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { municipality: municipalityId } = await params;

  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!municipality) notFound();

  return (
    <TimelineClient
      municipalityName={municipality.name_ja}
      municipalityId={municipalityId}
    />
  );
}

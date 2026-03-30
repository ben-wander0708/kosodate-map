import { notFound } from "next/navigation";
import { dataRepository } from "@/lib/data/json-adapter";
import ApplyWizard from "./ApplyWizard";

interface ApplyPageProps {
  params: Promise<{ municipality: string }>;
}

export async function generateStaticParams() {
  const municipalities = await dataRepository.getMunicipalities();
  return municipalities.map((m) => ({ municipality: m.id }));
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { municipality: municipalityId } = await params;
  const municipality = await dataRepository.getMunicipality(municipalityId);
  if (!municipality) notFound();

  return (
    <ApplyWizard
      municipalityId={municipalityId}
      municipalityName={municipality.name_ja}
    />
  );
}

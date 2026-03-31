import { notFound } from "next/navigation";
import { Suspense } from "react";
import { dataRepository } from "@/lib/data/json-adapter";
import ChecklistClient from "./ChecklistClient";

interface ChecklistPageProps {
  params: Promise<{ municipality: string }>;
}

export async function generateStaticParams() {
  const municipalities = await dataRepository.getMunicipalities();
  return municipalities.map((m) => ({ municipality: m.id }));
}

export default async function ChecklistPage({ params }: ChecklistPageProps) {
  const { municipality: municipalityId } = await params;

  const [municipality, checklist] = await Promise.all([
    dataRepository.getMunicipality(municipalityId),
    dataRepository.getChecklist(municipalityId),
  ]);

  if (!municipality) notFound();
  if (!checklist) notFound();

  return (
    <Suspense fallback={
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
    }>
      <ChecklistClient
        checklist={checklist}
        municipalityName={municipality.name_ja}
        municipalityId={municipalityId}
      />
    </Suspense>
  );
}

import { redirect } from "next/navigation";

interface ShopsPageProps {
  params: Promise<{ municipality: string }>;
}

export default async function ShopsPage({ params }: ShopsPageProps) {
  const { municipality: municipalityId } = await params;
  redirect(`/${municipalityId}/surroundings`);
}

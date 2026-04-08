import { dataRepository } from "@/lib/data/json-adapter";
import type { MetadataRoute } from "next";

const BASE_URL = "https://kosodate-map.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const municipalities = await dataRepository.getMunicipalities();

  const municipalityPages = await Promise.all(
    municipalities.map(async (m) => {
      const [nurseries, clinics] = await Promise.all([
        dataRepository.getNurseries(m.id),
        dataRepository.getClinics(m.id),
      ]);

      const nurseryPages: MetadataRoute.Sitemap = nurseries.map((n) => ({
        url: `${BASE_URL}/${m.id}/nurseries/${n.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

      const clinicPages: MetadataRoute.Sitemap = clinics.map((c) => ({
        url: `${BASE_URL}/${m.id}/clinics/${c.id}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));

      const staticPages: MetadataRoute.Sitemap = [
        { url: `${BASE_URL}/${m.id}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
        { url: `${BASE_URL}/${m.id}/checklist`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
        { url: `${BASE_URL}/${m.id}/apply`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
        { url: `${BASE_URL}/${m.id}/faq`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
        { url: `${BASE_URL}/${m.id}/timeline`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 },
        { url: `${BASE_URL}/${m.id}/shops`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 },
        { url: `${BASE_URL}/${m.id}/community`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
      ];

      return [...staticPages, ...nurseryPages, ...clinicPages];
    })
  );

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    ...municipalityPages.flat(),
  ];
}

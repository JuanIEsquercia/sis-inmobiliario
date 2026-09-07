import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { SITE_URL } from "@/lib/seo";

// Dinámico a propósito — se regenera en cada request (Next lo cachea
// como cualquier ruta) en vez de congelarse en el build, porque el
// catálogo de propiedades cambia todos los días con el sync de Adinco.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await withRetry(() =>
    prisma.listing.findMany({
      where: { isActive: true },
      select: { id: true, sourceUpdatedAt: true },
      orderBy: { sourceUpdatedAt: "desc" },
    })
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/propiedades`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/equipo`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const listingRoutes: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${SITE_URL}/propiedades/${listing.id}`,
    lastModified: listing.sourceUpdatedAt ?? undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...listingRoutes];
}

import { prisma } from "@/lib/prisma";
import { parseFeed } from "@/lib/feed";
import { withRetry } from "@/lib/db-retry";
import type { Prisma } from "@/generated/prisma/client";

export interface SyncResult {
  skippedUnchanged: boolean;
  created: number;
  updated: number;
  delisted: number;
  parseErrors: { index: number; reason: string }[];
  durationMs: number;
}

export async function runSync(
  options: { force?: boolean; onProgress?: (done: number, total: number) => void } = {}
): Promise<SyncResult> {
  const start = Date.now();
  const feedUrl = process.env.ADINCO_FEED_URL;
  if (!feedUrl) throw new Error("Falta la variable de entorno ADINCO_FEED_URL");

  const head = await fetch(feedUrl, { method: "HEAD" });
  if (!head.ok) throw new Error(`No se pudo consultar el feed (HTTP ${head.status})`);
  const lastModified = head.headers.get("last-modified");
  const etag = head.headers.get("etag");

  const state = await withRetry(() => prisma.syncState.findUnique({ where: { id: 1 } }));
  const unchanged =
    !options.force &&
    !!state &&
    lastModified !== null &&
    state.lastModified === lastModified &&
    state.etag === etag;

  if (unchanged) {
    return {
      skippedUnchanged: true,
      created: 0,
      updated: 0,
      delisted: 0,
      parseErrors: [],
      durationMs: Date.now() - start,
    };
  }

  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`No se pudo descargar el feed (HTTP ${res.status})`);
  const xml = await res.text();

  const { listings, skipped } = parseFeed(xml);

  let created = 0;
  let updated = 0;
  const seenExternalIds = listings.map((l) => l.externalId);
  const agencyIdByExternalId = new Map<string, number>();

  const existingIds = new Set(
    (
      await withRetry(() =>
        prisma.listing.findMany({
          where: { externalId: { in: seenExternalIds } },
          select: { externalId: true },
        })
      )
    ).map((l) => l.externalId)
  );

  let done = 0;
  for (const listing of listings) {
    let agencyId: number | undefined;
    const agencyData = listing.agency;
    if (agencyData) {
      const cachedId = agencyIdByExternalId.get(agencyData.externalId);
      if (cachedId) {
        agencyId = cachedId;
      } else {
        const agency = await withRetry(() =>
          prisma.agency.upsert({
            where: { externalId: agencyData.externalId },
            create: { ...agencyData },
            update: {
              name: agencyData.name,
              logoUrl: agencyData.logoUrl,
              officeAddress: agencyData.officeAddress,
              officeZipCode: agencyData.officeZipCode,
              phones: agencyData.phones,
            },
          })
        );
        agencyIdByExternalId.set(agencyData.externalId, agency.id);
        agencyId = agency.id;
      }
    }

    const { images, videos, agency: _agency, rawData, ...rest } = listing;
    void _agency;
    const data = { ...rest, rawData: rawData as Prisma.InputJsonValue };

    if (existingIds.has(listing.externalId)) updated++;
    else created++;

    await withRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const listingRow = await tx.listing.upsert({
            where: { externalId: listing.externalId },
            create: { ...data, agencyId, isActive: true },
            update: { ...data, agencyId, isActive: true },
          });

          await tx.listingImage.deleteMany({ where: { listingId: listingRow.id } });
          if (images.length > 0) {
            await tx.listingImage.createMany({
              data: images.map((img) => ({ ...img, listingId: listingRow.id })),
            });
          }

          await tx.listingVideo.deleteMany({ where: { listingId: listingRow.id } });
          if (videos.length > 0) {
            await tx.listingVideo.createMany({
              data: videos.map((v) => ({ ...v, listingId: listingRow.id })),
            });
          }
        },
        { timeout: 20000, maxWait: 10000 }
      )
    );

    done++;
    options.onProgress?.(done, listings.length);
  }

  const { count: delisted } = await withRetry(() =>
    prisma.listing.updateMany({
      where: { isActive: true, externalId: { notIn: seenExternalIds } },
      data: { isActive: false },
    })
  );

  await withRetry(() =>
    prisma.syncState.upsert({
      where: { id: 1 },
      create: { id: 1, lastModified, etag, lastSyncedAt: new Date() },
      update: { lastModified, etag, lastSyncedAt: new Date() },
    })
  );

  return {
    skippedUnchanged: false,
    created,
    updated,
    delisted,
    parseErrors: skipped,
    durationMs: Date.now() - start,
  };
}

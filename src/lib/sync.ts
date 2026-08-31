import { prisma } from "@/lib/prisma";
import { parseFeed, type NormalizedAgency } from "@/lib/feed";
import { withRetry } from "@/lib/db-retry";
import type { Prisma } from "@/generated/prisma/client";

export interface SyncResult {
  skippedUnchanged: boolean;
  created: number;
  updated: number;
  // Avisos del feed cuya fecha de actualización no cambió desde el
  // último sync — se saltean sin tocar la base (ver comentario más
  // abajo). Antes se reprocesaban igual que los que sí cambiaron.
  unchanged: number;
  delisted: number;
  parseErrors: { index: number; reason: string }[];
  durationMs: number;
}

// Cuántos avisos se procesan en paralelo — uno por uno tardaba minutos
// de más con centenares de avisos (cada uno son varios viajes de ida y
// vuelta a la base, en fila); todos a la vez arriesga agotar el pool de
// conexiones de Supabase. Este número es conservador a propósito.
const CONCURRENCY = 10;

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
  const feedUnchanged =
    !options.force &&
    !!state &&
    lastModified !== null &&
    state.lastModified === lastModified &&
    state.etag === etag;

  if (feedUnchanged) {
    return {
      skippedUnchanged: true,
      created: 0,
      updated: 0,
      unchanged: 0,
      delisted: 0,
      parseErrors: [],
      durationMs: Date.now() - start,
    };
  }

  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`No se pudo descargar el feed (HTTP ${res.status})`);
  const xml = await res.text();

  const { listings, skipped } = parseFeed(xml);
  const total = listings.length;
  const seenExternalIds = listings.map((l) => l.externalId);

  // Trae de una sola vez lo que ya existe (id + fecha de actualización
  // del feed) para poder saltear, sin tocar la base, los avisos que no
  // cambiaron desde el último sync — antes se reprocesaban todos por
  // igual (borrar + recrear fotos/videos) aunque el feed entero solo
  // hubiera cambiado por un aviso.
  const existingListings = await withRetry(() =>
    prisma.listing.findMany({
      where: { externalId: { in: seenExternalIds } },
      select: { externalId: true, sourceUpdatedAt: true },
    })
  );
  const existingByExternalId = new Map(existingListings.map((l) => [l.externalId, l]));

  // Las agencias se resuelven todas de una vez ANTES del loop principal
  // (son pocas y se repiten entre avisos) — así el loop de abajo no
  // upsertea la misma agencia una y otra vez, y se puede paralelizar sin
  // que dos avisos con la misma agencia nueva compitan por crearla al
  // mismo tiempo.
  const uniqueAgencies = new Map<string, NormalizedAgency>();
  for (const listing of listings) {
    if (listing.agency) uniqueAgencies.set(listing.agency.externalId, listing.agency);
  }
  const agencyIdByExternalId = new Map<string, number>();
  for (const agencyData of uniqueAgencies.values()) {
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
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let done = 0;

  async function processListing(listing: (typeof listings)[number]) {
    const existing = existingByExternalId.get(listing.externalId);

    if (!options.force && existing && existing.sourceUpdatedAt?.getTime() === listing.sourceUpdatedAt?.getTime()) {
      unchanged++;
      done++;
      options.onProgress?.(done, total);
      return;
    }

    const agencyId = listing.agency ? agencyIdByExternalId.get(listing.agency.externalId) : undefined;
    const { images, videos, agency: _agency, rawData, ...rest } = listing;
    void _agency;
    const data = { ...rest, rawData: rawData as Prisma.InputJsonValue };

    if (existing) updated++;
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
    options.onProgress?.(done, total);
  }

  // Tandas de a CONCURRENCY en paralelo, no todo junto — ver comentario
  // en la constante.
  for (let i = 0; i < listings.length; i += CONCURRENCY) {
    const batch = listings.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processListing));
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
    unchanged,
    delisted,
    parseErrors: skipped,
    durationMs: Date.now() - start,
  };
}

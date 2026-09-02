"use server";

import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requireProfile, getContractGroupScope, contractGroupWhere } from "@/lib/auth";
import { clientLabel } from "@/lib/alquileres";

export interface GlobalSearchResult {
  kind: "contrato" | "cliente" | "unidad" | "venta" | "presupuesto";
  id: number;
  title: string;
  subtitle: string;
  href: string;
}

const kindOrder: GlobalSearchResult["kind"][] = ["contrato", "cliente", "unidad", "venta", "presupuesto"];

// Buscador global del header (Ctrl+K) — busca en paralelo en cada
// sección que el usuario puede ver, respetando los mismos permisos y el
// mismo scope por cartera que sus propios listados (nunca expone acá lo
// que esa persona no vería entrando por el menú). Cada categoría es
// independiente: si no tiene el permiso de esa sección, directamente no
// se busca ahí.
export async function buscarGlobal(query: string): Promise<GlobalSearchResult[]> {
  const profile = await requireProfile();
  const q = query.trim();
  if (q.length < 2) return [];

  const perms = profile.permissions;
  const tasks: Promise<GlobalSearchResult[]>[] = [];

  if (perms.includes("administraciones.ver")) {
    const scope = await getContractGroupScope(profile);
    tasks.push(
      withRetry(() =>
        prisma.contract.findMany({
          where: {
            ...(contractGroupWhere(scope) ?? {}),
            OR: [
              { unit: { propertyCode: { contains: q, mode: "insensitive" } } },
              { unit: { address: { contains: q, mode: "insensitive" } } },
              { tenant: { firstName: { contains: q, mode: "insensitive" } } },
              { tenant: { lastName: { contains: q, mode: "insensitive" } } },
              { owner: { firstName: { contains: q, mode: "insensitive" } } },
              { owner: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          },
          include: { unit: true, tenant: true, owner: true },
          take: 5,
        })
      ).then((rows) =>
        rows.map((c) => ({
          kind: "contrato" as const,
          id: c.id,
          title: `${c.unit.propertyCode} — ${c.unit.address}`,
          subtitle: `Inquilino: ${clientLabel(c.tenant)} · Propietario: ${clientLabel(c.owner)}`,
          href: `/backoffice/administraciones/${c.id}`,
        }))
      )
    );
  }

  if (perms.includes("clientes.ver")) {
    tasks.push(
      withRetry(() =>
        prisma.client.findMany({
          where: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { docId: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
        })
      ).then((rows) =>
        rows.map((c) => ({
          kind: "cliente" as const,
          id: c.id,
          title: `${c.firstName} ${c.lastName}`,
          subtitle: c.docId ? `DNI ${c.docId}` : "Cliente",
          href: `/backoffice/clientes/${c.id}`,
        }))
      )
    );
  }

  if (perms.includes("historial.ver")) {
    tasks.push(
      withRetry(() =>
        prisma.unit.findMany({
          where: {
            OR: [
              { propertyCode: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
        })
      ).then((rows) =>
        rows.map((u) => ({
          kind: "unidad" as const,
          id: u.id,
          title: `${u.propertyCode} — ${u.address}`,
          subtitle: u.city ?? "Propiedad",
          href: `/backoffice/historial/${u.id}`,
        }))
      )
    );
  }

  if (perms.includes("caja.ver")) {
    tasks.push(
      withRetry(() =>
        prisma.sale.findMany({
          where: {
            OR: [
              { unit: { propertyCode: { contains: q, mode: "insensitive" } } },
              { unit: { address: { contains: q, mode: "insensitive" } } },
              { seller: { firstName: { contains: q, mode: "insensitive" } } },
              { seller: { lastName: { contains: q, mode: "insensitive" } } },
              { buyer: { firstName: { contains: q, mode: "insensitive" } } },
              { buyer: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          },
          include: { unit: true, seller: true, buyer: true },
          take: 5,
        })
      ).then((rows) =>
        rows.map((s) => ({
          kind: "venta" as const,
          id: s.id,
          title: `${s.unit.propertyCode} — ${s.unit.address}`,
          subtitle: `Vendedor: ${clientLabel(s.seller)} · Comprador: ${clientLabel(s.buyer)}`,
          href: `/backoffice/caja/ventas/${s.id}`,
        }))
      )
    );
  }

  if (perms.includes("presupuestos.ver")) {
    tasks.push(
      withRetry(() =>
        prisma.budget.findMany({
          where: {
            OR: [
              { unitDetail: { contains: q, mode: "insensitive" } },
              { tenantName: { contains: q, mode: "insensitive" } },
              { buyerName: { contains: q, mode: "insensitive" } },
              { ownerName: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
        })
      ).then((rows) =>
        rows.map((b) => ({
          kind: "presupuesto" as const,
          id: b.id,
          title: b.unitDetail,
          subtitle: b.type === "VENTA" ? `Venta — ${b.buyerName ?? "A completar"} / ${b.ownerName ?? "A completar"}` : `Alquiler — ${b.tenantName ?? "A completar"}`,
          href: `/backoffice/presupuestos/${b.id}`,
        }))
      )
    );
  }

  const results = await Promise.all(tasks);
  // Orden fijo por categoría (contrato > cliente > unidad > venta), no
  // por relevancia — con `take: 5` por categoría alcanza para que se
  // entienda de un vistazo, sin necesidad de rankear texto.
  return kindOrder.flatMap((kind) => results.flat().filter((r) => r.kind === kind));
}

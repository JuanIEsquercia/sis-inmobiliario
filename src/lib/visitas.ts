import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { diaArgentina, diaComoFecha } from "@/lib/visit-rules";
import type { Prisma, Profile, VisitStatus } from "@/generated/prisma/client";

// Consultas de llaves y visitas. Las reglas (turnos, estados) están en
// visit-rules.ts; acá solo se lee la base.

// Quién ve qué: el que gestiona llaves ve todas; el resto, solo las suyas.
export function puedeGestionarLlaves(profile: Pick<Profile, "permissions">): boolean {
  return profile.permissions.includes("visitas.gestionar_llaves");
}

export function alcanceVisitas(profile: Pick<Profile, "id" | "permissions">): Prisma.VisitWhereInput {
  return puedeGestionarLlaves(profile) ? {} : { vendedorId: profile.id };
}

const ESTADOS_ABIERTOS: VisitStatus[] = ["PEDIDA", "RETIRADA", "COORDINADA"];

const visitaListaSelect = {
  id: true,
  date: true,
  slot: true,
  status: true,
  keyLocation: true,
  retiradaAt: true,
  devueltaAt: true,
  returnConfirmedAt: true,
  listing: { select: { id: true, code: true, address: true, contentTitle: true, title: true } },
  vendedor: { select: { id: true, username: true } },
  client: { select: { id: true, firstName: true, lastName: true } },
  pedido: { select: { id: true, clienteNombre: true } },
  outcome: { select: { name: true } },
} satisfies Prisma.VisitSelect;

export type VisitaLista = Prisma.VisitGetPayload<{ select: typeof visitaListaSelect }>;

export interface FiltrosVisitas {
  vista?: string; // "hoy" | "abiertas" | "todas"
  vendedor?: string;
  codigo?: string;
  estado?: string;
}

export async function getVisitas(filtros: FiltrosVisitas, alcance: Prisma.VisitWhereInput) {
  const and: Prisma.VisitWhereInput[] = [alcance];
  const vista = filtros.vista ?? "hoy";
  if (vista === "hoy") and.push({ date: diaComoFecha(diaArgentina()) });
  if (vista === "abiertas") {
    // Abiertas: la visita no terminó, o la llave de la inmobiliaria
    // todavía no volvió (o no se confirmó que volvió).
    and.push({
      OR: [
        { status: { in: ESTADOS_ABIERTOS } },
        { keyLocation: "INMOBILIARIA", retiradaAt: { not: null }, devueltaAt: null },
        { keyLocation: "INMOBILIARIA", devueltaAt: { not: null }, returnConfirmedAt: null },
      ],
    });
  }
  if (filtros.vendedor) and.push({ vendedorId: filtros.vendedor });
  if (filtros.codigo?.trim()) and.push({ listing: { code: filtros.codigo.trim() } });
  if (filtros.estado) and.push({ status: filtros.estado as VisitStatus });

  return withRetry(() =>
    prisma.visit.findMany({
      where: { AND: and },
      select: visitaListaSelect,
      orderBy: vista === "todas" ? [{ startsAt: "desc" }] : [{ startsAt: "asc" }],
      take: 200,
    })
  );
}

export async function getVisitaById(id: number) {
  return withRetry(() =>
    prisma.visit.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true,
            code: true,
            address: true,
            contentTitle: true,
            title: true,
            keyLocation: true,
            keyNumber: true,
            keySets: true,
            keyNotes: true,
            keyContactRelation: true,
            keyContact: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        vendedor: { select: { id: true, username: true, firstName: true, lastName: true } },
        client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        pedido: { select: { id: true, clienteNombre: true, clienteTelefono: true } },
        outcome: { select: { id: true, name: true } },
        returnConfirmedBy: { select: { username: true } },
        events: { orderBy: { at: "asc" }, include: { by: { select: { username: true } } } },
      },
    })
  );
}

// Panel de quien entrega las llaves en la inmobiliaria.
export async function getLlavesDelDia() {
  const hoy = diaComoFecha(diaArgentina());
  const [aEntregar, afuera, porConfirmar] = await withRetry(() =>
    Promise.all([
      prisma.visit.findMany({
        where: { keyLocation: "INMOBILIARIA", status: "PEDIDA", date: { lte: hoy } },
        select: visitaListaSelect,
        orderBy: { startsAt: "asc" },
      }),
      prisma.visit.findMany({
        where: { keyLocation: "INMOBILIARIA", retiradaAt: { not: null }, devueltaAt: null },
        select: visitaListaSelect,
        orderBy: { startsAt: "asc" },
      }),
      prisma.visit.findMany({
        where: { keyLocation: "INMOBILIARIA", devueltaAt: { not: null }, returnConfirmedAt: null },
        select: visitaListaSelect,
        orderBy: { devueltaAt: "asc" },
      }),
    ])
  );
  return { aEntregar, afuera, porConfirmar, hoy };
}

// Llaves de la inmobiliaria que no volvieron el día de la visita (para la
// campanita). Con `vendedorId`, solo las que tiene esa persona.
export async function contarLlavesSinDevolver(vendedorId: string | null): Promise<number> {
  const hoy = diaComoFecha(diaArgentina());
  return withRetry(() =>
    prisma.visit.count({
      where: {
        keyLocation: "INMOBILIARIA",
        retiradaAt: { not: null },
        devueltaAt: null,
        date: { lt: hoy },
        ...(vendedorId ? { vendedorId } : {}),
      },
    })
  );
}

export async function getCategoriasResultado(soloActivas = true) {
  return withRetry(() =>
    prisma.visitOutcome.findMany({
      where: soloActivas ? { isActive: true } : {},
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { visits: true } } },
    })
  );
}

// Visitas de una propiedad, de un cliente o de un pedido (historial en
// cada ficha). Se respeta el alcance de quien mira.
export async function getVisitasDe(
  donde: { listingId: number } | { clientId: number } | { pedidoId: number },
  alcance: Prisma.VisitWhereInput
) {
  return withRetry(() =>
    prisma.visit.findMany({
      where: { AND: [alcance, donde] },
      select: visitaListaSelect,
      orderBy: { startsAt: "desc" },
      take: 50,
    })
  );
}

export function interesadoLabel(v: { client: { firstName: string; lastName: string } | null; pedido: { id: number; clienteNombre: string } | null }): string {
  if (v.client) return `${v.client.firstName} ${v.client.lastName}`;
  if (v.pedido) return `${v.pedido.clienteNombre} (pedido #${v.pedido.id})`;
  return "Sin interesado";
}

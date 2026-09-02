import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import type { BudgetRecipient } from "@/generated/prisma/client";

// Mismo criterio que agentLabel (lib/caja.ts) — acá el creador siempre
// existe (no es opcional como un agente asignado), pero firstName/
// lastName sí pueden faltar en un Profile viejo, así que se cae al
// username en vez de imprimir "null null".
export function creatorLabel(profile: { firstName: string | null; lastName: string | null; username: string }) {
  return profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : `@${profile.username}`;
}

export function budgetItemsTotal(items: { amount: unknown }[]): number {
  return items.reduce((sum, i) => sum + Number(i.amount), 0);
}

export function itemsByRecipient<T extends { recipient: BudgetRecipient }>(
  items: T[],
  recipient: BudgetRecipient
): T[] {
  return items.filter((i) => i.recipient === recipient);
}

const budgetInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
  createdBy: { select: { firstName: true, lastName: true, username: true } },
};

// Listado propio del módulo — funciona como el "historial" de
// presupuestos que pidió el usuario: quién lo hizo, de qué tipo, sobre
// qué propiedad (texto libre, nunca exige una Unit cargada).
export async function getBudgets(query?: string) {
  const q = query?.trim();
  return withRetry(() =>
    prisma.budget.findMany({
      where: q
        ? {
            OR: [
              { unitDetail: { contains: q, mode: "insensitive" } },
              { tenantName: { contains: q, mode: "insensitive" } },
              { buyerName: { contains: q, mode: "insensitive" } },
              { ownerName: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: budgetInclude,
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function getBudgetById(id: number) {
  return withRetry(() => prisma.budget.findUnique({ where: { id }, include: budgetInclude }));
}

// Catálogo administrable de conceptos frecuentes (ver comentario en el
// modelo BudgetConcept) — mismo patrón de búsqueda que listClients.
export async function getBudgetConcepts(query?: string) {
  const q = query?.trim();
  return withRetry(() =>
    prisma.budgetConcept.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
    })
  );
}

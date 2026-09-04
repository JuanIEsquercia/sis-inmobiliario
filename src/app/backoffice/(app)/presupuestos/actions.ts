"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { optionalDecimal, optionalStr, requiredStr } from "@/lib/form-utils";
import type { BudgetRecipient, BudgetType } from "@/generated/prisma/client";

interface ItemRow {
  description: string;
  amount: string;
}

// Filas repetibles cargadas del lado del cliente (BudgetItemsFields) con
// nombres `${prefix}.${indice}.description` / `.amount` — mismo criterio
// que guarantorIndices (administraciones/actions.ts) para reconstruir la
// lista sin depender de que los índices sean consecutivos (una fila
// borrada en el medio no corre a las demás). Filas sin describir o sin
// monto se descartan en silencio: son las que quedaron "agregadas" pero
// nunca se llegaron a completar.
function parseItemRows(formData: FormData, prefix: string): ItemRow[] {
  const indices = new Set<number>();
  const re = new RegExp(`^${prefix}\\.(\\d+)\\.description$`);
  for (const key of formData.keys()) {
    const match = key.match(re);
    if (match) indices.add(Number(match[1]));
  }
  return [...indices]
    .sort((a, b) => a - b)
    .map((i) => ({
      description: String(formData.get(`${prefix}.${i}.description`) ?? "").trim(),
      amount: String(formData.get(`${prefix}.${i}.amount`) ?? "").trim(),
    }))
    .filter((row) => row.description !== "" && row.amount !== "");
}

function toItemsData(rows: ItemRow[], recipient: BudgetRecipient, roleLabel: string) {
  return rows.map((row, i) => {
    const amount = optionalDecimal(row.amount);
    if (amount === null) {
      throw new Error(`El importe de "${row.description}" (${roleLabel}) no es un número válido.`);
    }
    return { recipient, description: row.description, amount, sortOrder: i };
  });
}

// Lectura + validación común a alta y edición: unitDetail y los nombres
// de las partes son texto libre (ver comentario en el modelo Budget) —
// sin FK a Unit/Client, se puede armar sin que exista todavía un
// Contract/Sale real. Alquiler carga una sola lista de ítems
// (INQUILINO); Venta carga dos listas independientes (COMPRADOR y
// PROPIETARIO), cada una con sus propios gastos.
function parseBudgetForm(formData: FormData) {
  const type = requiredStr(formData.get("type"), "Tipo") as BudgetType;
  if (type !== "ALQUILER" && type !== "VENTA") throw new Error("Tipo de presupuesto inválido.");

  const unitDetail = requiredStr(formData.get("unitDetail"), "Detalle de la propiedad");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const notes = optionalStr(formData.get("notes"));
  const observations = optionalStr(formData.get("observations"));

  let tenantName: string | null = null;
  let buyerName: string | null = null;
  let ownerName: string | null = null;
  let itemsData: ReturnType<typeof toItemsData> = [];

  if (type === "ALQUILER") {
    tenantName = optionalStr(formData.get("tenantName"));
    const rows = parseItemRows(formData, "items");
    if (rows.length === 0) throw new Error("Cargá al menos un concepto.");
    itemsData = toItemsData(rows, "INQUILINO", "Inquilino");
  } else {
    buyerName = optionalStr(formData.get("buyerName"));
    ownerName = optionalStr(formData.get("ownerName"));
    const buyerRows = parseItemRows(formData, "itemsComprador");
    const ownerRows = parseItemRows(formData, "itemsPropietario");
    if (buyerRows.length === 0 && ownerRows.length === 0) {
      throw new Error("Cargá al menos un concepto, para el comprador o para el propietario.");
    }
    itemsData = [
      ...toItemsData(buyerRows, "COMPRADOR", "Comprador"),
      ...toItemsData(ownerRows, "PROPIETARIO", "Propietario"),
    ];
  }

  return { type, unitDetail, currency, notes, observations, tenantName, buyerName, ownerName, itemsData };
}

export async function crearPresupuesto(formData: FormData) {
  const profile = await requirePermission("presupuestos.crear");
  // `itemsData` se separa a propósito antes de spreadear el resto — no
  // es un campo de Budget (es la lista de BudgetItem a crear aparte), y
  // colarlo en `data` hace que Prisma tire "Unknown argument itemsData"
  // en tiempo de ejecución. tsc no lo detecta: los excess-property-checks
  // de TypeScript no aplican a propiedades que vienen de un spread.
  const { itemsData, ...data } = parseBudgetForm(formData);

  const budget = await withRetry(() =>
    prisma.budget.create({
      data: { ...data, createdById: profile.id, items: { createMany: { data: itemsData } } },
    })
  );

  revalidatePath("/backoffice/presupuestos");
  redirect(`/backoffice/presupuestos/${budget.id}`);
}

// Reemplaza el presupuesto entero (datos + ítems) por lo que venga en el
// formulario — no hay ninguna otra tabla que referencie un BudgetItem
// puntual (a diferencia de, por ejemplo, un Payment ya cobrado), así que
// borrar todo y recrear es más simple y seguro que tratar de diffear fila
// por fila. El tipo (Alquiler/Venta) no se puede cambiar acá — cambiaría
// qué campos/roles tiene sentido guardar; para eso hay que cargar un
// presupuesto nuevo.
export async function actualizarPresupuesto(id: number, formData: FormData) {
  await requirePermission("presupuestos.crear");
  const existing = await withRetry(() => prisma.budget.findUniqueOrThrow({ where: { id }, select: { type: true } }));

  const data = parseBudgetForm(formData);
  if (data.type !== existing.type) {
    throw new Error("No se puede cambiar el tipo de un presupuesto ya creado.");
  }

  await withRetry(() =>
    prisma.$transaction([
      prisma.budgetItem.deleteMany({ where: { budgetId: id } }),
      prisma.budget.update({
        where: { id },
        data: {
          unitDetail: data.unitDetail,
          currency: data.currency,
          notes: data.notes,
          observations: data.observations,
          tenantName: data.tenantName,
          buyerName: data.buyerName,
          ownerName: data.ownerName,
          items: { createMany: { data: data.itemsData } },
        },
      }),
    ])
  );

  revalidatePath("/backoffice/presupuestos");
  revalidatePath(`/backoffice/presupuestos/${id}`);
  redirect(`/backoffice/presupuestos/${id}`);
}

// Un presupuesto no mueve plata ni queda referenciado desde ningún otro
// registro (a diferencia de anularContrato) — borrarlo es una operación
// simple, sin resguardos especiales.
export async function eliminarPresupuesto(id: number) {
  await requirePermission("presupuestos.crear");
  await withRetry(() => prisma.budget.delete({ where: { id } }));
  revalidatePath("/backoffice/presupuestos");
  redirect("/backoffice/presupuestos");
}

export interface ConceptOption {
  id: number;
  name: string;
  defaultAmount: number | null;
}

// Autocompletado del catálogo al cargar un ítem — mismo patrón que
// buscarClientes, salvo que acá un query vacío trae el catálogo entero
// (hasta el límite) en vez de nada: la idea es que al hacer foco en el
// campo ya se vea la lista completa para elegir, sin tener que escribir
// primero para "activar" la búsqueda. Devuelve `defaultAmount` ya
// convertido a number: un Decimal de Prisma no cruza la frontera server
// action → client component (mismo motivo por el que toRepartoSchemeInfo
// convierte los porcentajes del esquema de comisiones antes de
// devolverlos).
export async function buscarConceptos(query: string): Promise<ConceptOption[]> {
  await requirePermission("presupuestos.crear");
  const q = query.trim();

  const results = await withRetry(() =>
    prisma.budgetConcept.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      take: 20,
    })
  );

  return results.map((c) => ({ id: c.id, name: c.name, defaultAmount: c.defaultAmount ? Number(c.defaultAmount) : null }));
}

// Crear un concepto nuevo desde el mismo ítem del presupuesto, sin ir a
// la pantalla de catálogo — a propósito con el mismo permiso que crear
// presupuestos (presupuestos.crear), no el de gestionar el catálogo
// (presupuestos.conceptos.gestionar): agregar un concepto nuevo mientras
// se cotiza es parte del flujo normal de cualquiera que cotiza, no una
// tarea administrativa aparte. Upsert por nombre (como resolveUnit con
// propertyCode) — si dos personas escriben el mismo concepto nuevo casi
// a la vez, o si ya existía con otra mayúscula/minúscula exacta, no se
// duplica.
export async function crearConceptoDesdeItem(name: string): Promise<ConceptOption> {
  const profile = await requirePermission("presupuestos.crear");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El concepto no puede estar vacío.");

  const concept = await withRetry(() =>
    prisma.budgetConcept.upsert({
      where: { name: trimmed },
      create: { name: trimmed, createdById: profile.id },
      update: {},
    })
  );

  return { id: concept.id, name: concept.name, defaultAmount: concept.defaultAmount ? Number(concept.defaultAmount) : null };
}

export async function crearConcepto(formData: FormData) {
  const profile = await requirePermission("presupuestos.conceptos.gestionar");
  const name = requiredStr(formData.get("name"), "Concepto");
  const defaultAmount = optionalDecimal(formData.get("defaultAmount"));

  await withRetry(() =>
    prisma.budgetConcept.create({ data: { name, defaultAmount, createdById: profile.id } })
  );

  revalidatePath("/backoffice/presupuestos/conceptos");
}

export async function actualizarConcepto(id: number, formData: FormData) {
  await requirePermission("presupuestos.conceptos.gestionar");
  const name = requiredStr(formData.get("name"), "Concepto");
  const defaultAmount = optionalDecimal(formData.get("defaultAmount"));

  await withRetry(() => prisma.budgetConcept.update({ where: { id }, data: { name, defaultAmount } }));

  revalidatePath("/backoffice/presupuestos/conceptos");
}

export async function eliminarConcepto(id: number) {
  await requirePermission("presupuestos.conceptos.gestionar");
  await withRetry(() => prisma.budgetConcept.delete({ where: { id } }));
  revalidatePath("/backoffice/presupuestos/conceptos");
}

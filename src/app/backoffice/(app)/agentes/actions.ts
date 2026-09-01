"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { optionalStr, requiredDate, requiredDecimal, requiredMethod, requiredStr } from "@/lib/form-utils";
import { resolveDebtSourceCurrency, getAgentDebtItems, debtKey } from "@/lib/agentes";
import type { AgentDebtRole, AgentDebtSource, CommissionSchemeType } from "@/generated/prisma/client";

// Imputa un pago a UNA línea puntual de lo devengado (sourceType +
// sourceId + role) — puede ser el total de esa línea o menos; el saldo
// restante se puede seguir pagando después con otro registro igual a
// este. Solo puede registrar pagos quien tenga el permiso — esto mueve
// plata de verdad y hay que poder auditar quién lo cargó.
export async function registrarPagoDeuda(
  agentId: string,
  sourceType: AgentDebtSource,
  sourceId: number,
  role: AgentDebtRole,
  formData: FormData
) {
  const profile = await requirePermission("agentes.pagos.crear");

  const amount = requiredDecimal(formData.get("amount"), "Monto");
  const paidAt = optionalStr(formData.get("paidAt")) ? requiredDate(formData.get("paidAt"), "Fecha") : new Date();
  const method = requiredMethod(formData.get("method"));
  const notes = optionalStr(formData.get("notes"));
  // Nunca se lee del formulario — la moneda la fija la operación de
  // origen, no quien carga el pago (ver resolveDebtSourceCurrency).
  const currency = await resolveDebtSourceCurrency(sourceType, sourceId);

  await withRetry(() =>
    prisma.agentDebtPayment.create({
      data: { agentId, sourceType, sourceId, role, amount, currency, paidAt, method, notes, createdById: profile.id },
    })
  );

  revalidatePath(`/backoffice/agentes/${agentId}`);
  revalidatePath("/backoffice/agentes");
}

// Paga de una varias líneas de deuda a la vez, cada una por su saldo
// completo — la única regla es que todas compartan moneda (un
// AgentDebtPayment, como cualquier otro cobro/pago del sistema, es
// siempre de una sola moneda). Nunca confía en montos que pudieran venir
// del formulario: vuelve a resolver cada línea desde getAgentDebtItems,
// mismo criterio que resolveDebtSourceCurrency en registrarPagoDeuda.
export async function registrarPagoLote(agentId: string, formData: FormData) {
  const profile = await requirePermission("agentes.pagos.crear");

  const method = requiredMethod(formData.get("method"));
  const paidAt = optionalStr(formData.get("paidAt")) ? requiredDate(formData.get("paidAt"), "Fecha") : new Date();
  const notes = optionalStr(formData.get("notes"));

  const keys = formData.getAll("items").map(String);
  if (keys.length === 0) throw new Error("No seleccionaste ninguna línea para pagar.");

  const debtItems = await getAgentDebtItems(agentId);
  const selected = keys.map((key) => {
    const item = debtItems.find((i) => debtKey(i.sourceType, i.sourceId, i.role) === key);
    if (!item) throw new Error("Una de las líneas seleccionadas ya no existe o cambió — recargá la página.");
    if (item.saldo <= 0) throw new Error(`"${item.description}" ya está pagada.`);
    return item;
  });

  const currencies = new Set(selected.map((i) => i.currency));
  if (currencies.size > 1) {
    throw new Error("No se puede pagar en lote líneas con distinta moneda — separalas en pagos aparte.");
  }

  await withRetry(() =>
    prisma.agentDebtPayment.createMany({
      data: selected.map((item) => ({
        agentId,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        role: item.role,
        amount: item.saldo.toFixed(2),
        currency: item.currency,
        paidAt,
        method,
        notes,
        createdById: profile.id,
      })),
    })
  );

  revalidatePath(`/backoffice/agentes/${agentId}`);
  revalidatePath("/backoffice/agentes");
}

// Cada edición carga una versión NUEVA (ver comentario en el modelo
// CommissionScheme) — las operaciones ya cerradas conservan el reparto
// con el que se calcularon, aunque el esquema cambie después.
export async function crearEsquemaComision(type: CommissionSchemeType, formData: FormData) {
  const profile = await requirePermission("comisiones.gestionar");

  const reservaPercent = requiredDecimal(formData.get("reservaPercent"), "% fondo de reserva");
  const agenteFijoPercent = requiredDecimal(formData.get("agenteFijoPercent"), "% agente fijo");
  const agenteFijoId = requiredStr(formData.get("agenteFijoId"), "Agente fijo");
  const vendedorPercent = requiredDecimal(formData.get("vendedorPercent"), "% vendedor");
  const captadorPercent = requiredDecimal(formData.get("captadorPercent"), "% captador");

  const percents = [reservaPercent, agenteFijoPercent, vendedorPercent, captadorPercent].map(Number);
  if (percents.some((p) => p < 0 || p > 100)) {
    throw new Error("Los porcentajes deben estar entre 0 y 100.");
  }
  if (Number(reservaPercent) + Number(agenteFijoPercent) > 100) {
    throw new Error("Reserva + agente fijo no pueden superar el 100% del total.");
  }
  if (Number(vendedorPercent) + Number(captadorPercent) > 100) {
    throw new Error("Vendedor + captador no pueden superar el 100% del resto.");
  }

  await prisma.commissionScheme.create({
    data: { type, reservaPercent, agenteFijoPercent, agenteFijoId, vendedorPercent, captadorPercent, createdById: profile.id },
  });

  revalidatePath("/backoffice/agentes/esquema");
}

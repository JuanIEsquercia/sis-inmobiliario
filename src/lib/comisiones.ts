import { Prisma } from "@/generated/prisma/client";

type DecimalInput = string | number | Prisma.Decimal;

// Reparto de una comisión de Venta/Alquiler según su CommissionScheme
// activo. El "resto" es lo que queda después de reserva + agente fijo
// (normalmente 90%, pero se recalcula dinámicamente por si esos dos %
// cambian) — vendedor/captador son % de ese resto, no del total.
export function calcularReparto(
  commissionAmountInput: DecimalInput,
  scheme: {
    reservaPercent: DecimalInput;
    agenteFijoPercent: DecimalInput;
    vendedorPercent: DecimalInput;
    captadorPercent: DecimalInput;
  },
  // Si un rol no está presente (no se asignó agente), se asume que lo
  // cumplió la propia inmobiliaria — su % pasa a agenciaAmount en vez
  // de calcularse aparte.
  presencia: { vendedorPresente: boolean; captadorPresente: boolean } = {
    vendedorPresente: true,
    captadorPresente: true,
  }
) {
  const commissionAmount = new Prisma.Decimal(commissionAmountInput);
  const reservaAmount = commissionAmount.mul(scheme.reservaPercent).div(100);
  const agenteFijoAmount = commissionAmount.mul(scheme.agenteFijoPercent).div(100);
  const resto = commissionAmount.sub(reservaAmount).sub(agenteFijoAmount);

  const vendedorAmount = presencia.vendedorPresente ? resto.mul(scheme.vendedorPercent).div(100) : new Prisma.Decimal(0);
  const captadorAmount = presencia.captadorPresente ? resto.mul(scheme.captadorPercent).div(100) : new Prisma.Decimal(0);
  const agenciaAmount = resto.sub(vendedorAmount).sub(captadorAmount);

  return { reservaAmount, agenteFijoAmount, vendedorAmount, captadorAmount, agenciaAmount };
}

// Crea la comisión de alquiler (el hecho de que se devengó, y cuánto)
// dentro de una transacción ya abierta. La usan tanto el alta de
// contrato (cuando se carga la comisión en el mismo paso) como el alta
// suelta desde la ficha de un contrato ya existente. A propósito NO
// crea el CashMovement acá: cargar la comisión es distinto de tenerla
// cobrada — colocamos el alquiler pero no necesariamente cobramos ese
// mismo día (ver confirmarCobroComisionAlquiler, que es quien recién
// registra el ingreso real cuando efectivamente se cobra).
export async function crearRentalCommissionEnTx(
  tx: Prisma.TransactionClient,
  params: {
    contractId: number;
    amount: DecimalInput;
    currency: string;
    earnedAt: Date;
    vendedorAgentId: string | null;
    captadorAgentId: string | null;
    notes?: string | null;
    createdById: string;
  }
) {
  // Colocar un inquilino nuevo (ALQUILER) vs. renovarle el contrato a
  // uno que ya estaba (RENOVACION) son unidades de negocio distintas —
  // se decide automáticamente acá, según el contrato, nunca a mano.
  const contract = await tx.contract.findUniqueOrThrow({
    where: { id: params.contractId },
    select: { renewedFromContractId: true },
  });
  const origin = contract.renewedFromContractId ? "RENOVACION" : "ALQUILER";

  // El monto se guarda siempre, exista o no un esquema todavía para
  // `origin` — el reparto es información adicional, no un requisito
  // para cargar la comisión. Si no hay esquema (hoy es el caso de
  // RENOVACION), queda "sin repartir" (campos null, el monto entero
  // queda como ingreso de la inmobiliaria) y se puede completar más
  // adelante si se define un esquema para ese tipo.
  const scheme = await tx.commissionScheme.findFirst({ where: { type: origin }, orderBy: { vigenteDesde: "desc" } });
  const reparto = scheme
    ? calcularReparto(params.amount, scheme, {
        vendedorPresente: !!params.vendedorAgentId,
        captadorPresente: !!params.captadorAgentId,
      })
    : { reservaAmount: null, agenteFijoAmount: null, vendedorAmount: null, captadorAmount: null, agenciaAmount: null };

  const created = await tx.rentalCommission.create({
    data: {
      contractId: params.contractId,
      origin,
      amount: params.amount,
      currency: params.currency,
      earnedAt: params.earnedAt,
      vendedorAgentId: params.vendedorAgentId,
      captadorAgentId: params.captadorAgentId,
      commissionSchemeId: scheme?.id,
      ...reparto,
      notes: params.notes,
      createdById: params.createdById,
    },
  });

  return created;
}

import {
  Prisma,
  type CommissionInstallmentSource,
  type CommissionParty,
  type PaymentMethod,
  type CashMovementSource,
} from "@/generated/prisma/client";

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

// Una cuota del cronograma de cobro — la misma forma para Venta y
// Alquiler (ver comentario en el modelo CommissionInstallment).
// `yaCobrada` es una decisión explícita por cuota, nunca automática: una
// cuota recién cargada por default queda PENDIENTE, y solo genera su
// CashMovement en el momento si se la marca así a propósito (ej. "de
// contado", o una seña ya cobrada al firmar).
export interface CuotaEntrada {
  amount: DecimalInput;
  dueDate: Date;
  attributedTo: CommissionParty | null;
  pagareFirmado: boolean;
  yaCobrada: boolean;
  method: PaymentMethod | null;
}

// Corta en seco el viejo bug de "sumar comisión + cuotas": acá se valida
// que el cronograma sume EXACTAMENTE el total ya fijado de la operación
// — el total nunca sale de sumar cuotas, siempre es al revés (se carga
// una sola vez, aparte, y las cuotas son su cronograma de cobro).
export function validarSumaCuotas(cuotas: { amount: DecimalInput }[], total: DecimalInput) {
  const suma = cuotas.reduce((acc, c) => acc.add(new Prisma.Decimal(c.amount)), new Prisma.Decimal(0));
  const totalDecimal = new Prisma.Decimal(total);
  if (!suma.equals(totalDecimal)) {
    throw new Error(
      `Las cuotas suman ${suma.toFixed(2)} pero la comisión total es ${totalDecimal.toFixed(2)} — tienen que coincidir.`
    );
  }
}

// Crea el cronograma de cobro (cuotas o "de contado", que acá es
// simplemente un cronograma de una sola cuota) de una Venta o Alquiler
// ya cargada — mismo mecanismo para las dos. Cada cuota marcada
// `yaCobrada` genera su propio CashMovement en el momento; el resto
// queda PENDIENTE para confirmarse después (ver marcarCuotaPagada). No
// valida la suma acá — eso se hace antes, con validarSumaCuotas, porque
// el llamador es quien sabe cuál es el total contra el que hay que
// validar.
export async function crearCronogramaCobroEnTx(
  tx: Prisma.TransactionClient,
  params: {
    source: CommissionInstallmentSource;
    saleId?: number | null;
    rentalCommissionId?: number | null;
    currency: string;
    cuotas: CuotaEntrada[];
    vendedorAgentId: string | null;
    descriptionBase: string;
    cashMovementSource: CashMovementSource;
  }
) {
  const now = new Date();
  const totalCuotas = params.cuotas.length;

  for (let i = 0; i < params.cuotas.length; i++) {
    const cuota = params.cuotas[i];

    const installment = await tx.commissionInstallment.create({
      data: {
        source: params.source,
        saleId: params.saleId ?? null,
        rentalCommissionId: params.rentalCommissionId ?? null,
        numeroCuota: i + 1,
        totalCuotas,
        amount: cuota.amount,
        currency: params.currency,
        dueDate: cuota.dueDate,
        attributedTo: cuota.attributedTo,
        pagareFirmado: cuota.pagareFirmado,
        status: cuota.yaCobrada ? "PAGADA" : "PENDIENTE",
        paidAt: cuota.yaCobrada ? now : null,
        method: cuota.yaCobrada ? cuota.method : null,
      },
    });

    if (cuota.yaCobrada) {
      await tx.cashMovement.create({
        data: {
          source: params.cashMovementSource,
          description:
            totalCuotas > 1 ? `${params.descriptionBase} (cuota ${i + 1}/${totalCuotas})` : params.descriptionBase,
          amount: cuota.amount,
          currency: params.currency,
          method: cuota.method,
          commissionInstallmentId: installment.id,
          vendedorAgentId: params.vendedorAgentId,
        },
      });
    }
  }
}

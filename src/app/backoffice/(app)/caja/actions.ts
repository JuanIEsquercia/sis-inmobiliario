"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission, requireAnyPermission } from "@/lib/auth";
import { resolveClientOptional, resolveUnit } from "@/lib/backoffice-resolvers";
import { uploadAppraisalReport } from "@/lib/supabase/storage";
import { paymentBreakdown } from "@/lib/alquileres";
import {
  calcularReparto,
  crearRentalCommissionEnTx,
  crearCronogramaCobroEnTx,
  validarSumaCuotas,
  type CuotaEntrada,
} from "@/lib/comisiones";
import { getActiveCommissionScheme, toRepartoSchemeInfo } from "@/lib/caja";
import { optionalDecimal, optionalStr, requiredDate, requiredDecimal, requiredMethod, requiredStr } from "@/lib/form-utils";
import {
  Prisma,
  type CommissionSchemeType,
  type CommissionParty,
  type ExpenseType,
  type PaymentMethod,
} from "@/generated/prisma/client";

// Para el botón "Ya lo configuré" en los formularios que quedaron
// esperando el esquema — evita recargar toda la página (y perder lo ya
// tipeado) solo para volver a pedir el esquema recién creado.
export async function refrescarEsquema(type: CommissionSchemeType) {
  await requirePermission("caja.ver");
  const scheme = await getActiveCommissionScheme(type);
  return scheme ? toRepartoSchemeInfo(scheme) : null;
}

export async function buscarUnidadesCaja(query: string) {
  await requireAnyPermission(["caja.ventas.crear", "caja.tasaciones.crear"]);
  const q = query.trim();
  if (q.length < 2) return [];

  return withRetry(() =>
    prisma.unit.findMany({
      where: {
        OR: [
          { propertyCode: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, propertyCode: true, address: true, city: true, propertyType: true },
      orderBy: { propertyCode: "asc" },
      take: 8,
    })
  );
}

// Igual que buscarClientes (administraciones/actions.ts) pero gateado
// por el permiso de Caja — comprador/vendedor de una Venta no tienen
// por qué requerir "administraciones.crear".
export async function buscarClientesCaja(query: string) {
  await requirePermission("caja.ventas.crear");
  const q = query.trim();
  if (q.length < 2) return [];

  return withRetry(() =>
    prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { docId: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, docId: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 8,
    })
  );
}

function installmentIndices(formData: FormData): number[] {
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^installments\.(\d+)\./);
    if (match) indices.add(Number(match[1]));
  }
  return [...indices].sort((a, b) => a - b);
}

const VENTA_PARTIES = ["COMPRADOR", "VENDEDOR"] as const;
const ALQUILER_PARTIES = ["INQUILINO", "PROPIETARIO"] as const;

// Optativo a propósito (ver comentario en CommissionParty) — una cuota
// sin atribución puntual no es un error de carga.
function asCommissionParty(v: string | null, allowed: readonly CommissionParty[]): CommissionParty | null {
  return v && (allowed as readonly string[]).includes(v) ? (v as CommissionParty) : null;
}

export async function crearVenta(formData: FormData) {
  const profile = await requirePermission("caja.ventas.crear");

  const initialPriceAmount = optionalDecimal(formData.get("initialPriceAmount"));
  const saleAmount = optionalDecimal(formData.get("saleAmount"));
  // El total de la comisión SIEMPRE se carga acá, una sola vez y directo
  // — nunca sale de sumar cuotas (eso quedó al revés antes: ver
  // validarSumaCuotas más abajo, que corta en seco si no coinciden).
  const commissionAmount = requiredDecimal(formData.get("commissionAmount"), "Comisión de venta");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const closedAt = requiredDate(formData.get("closedAt"), "Fecha de cierre");
  const vendedorAgentId = optionalStr(formData.get("vendedorAgentId"));
  const captadorAgentId = optionalStr(formData.get("captadorAgentId"));
  const notes = optionalStr(formData.get("notes"));

  // "De contado" (enCuotas destildado) es, para el cronograma, una sola
  // cuota que además se da por cobrada hoy mismo — mismo mecanismo
  // (CommissionInstallment) que Alquiler, ver crearCronogramaCobroEnTx.
  const enCuotas = formData.get("enCuotas") === "on";
  const cuotas: CuotaEntrada[] = enCuotas
    ? installmentIndices(formData).map((i, idx) => {
        const yaCobrada = formData.get(`installments.${i}.yaCobrada`) === "on";
        return {
          amount: requiredDecimal(formData.get(`installments.${i}.amount`), `Monto cuota ${idx + 1}`),
          dueDate: requiredDate(formData.get(`installments.${i}.dueDate`), `Vencimiento cuota ${idx + 1}`),
          attributedTo: asCommissionParty(optionalStr(formData.get(`installments.${i}.attributedTo`)), VENTA_PARTIES),
          pagareFirmado: formData.get(`installments.${i}.pagareFirmado`) === "on",
          yaCobrada,
          method: yaCobrada ? requiredMethod(formData.get(`installments.${i}.method`), `Medio de cobro cuota ${idx + 1}`) : null,
        };
      })
    : [
        {
          amount: commissionAmount,
          dueDate: closedAt,
          attributedTo: null,
          pagareFirmado: false,
          yaCobrada: true,
          method: requiredMethod(formData.get("method")),
        },
      ];
  if (cuotas.length === 0) {
    throw new Error("Agregá al menos una cuota o destildá el pago en cuotas.");
  }
  validarSumaCuotas(cuotas, commissionAmount);

  const sale = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const sellerId = await resolveClientOptional(tx, formData, "seller", "Parte vendedora");
      const buyerId = await resolveClientOptional(tx, formData, "buyer", "Comprador");
      const unitId = await resolveUnit(tx, formData);
      const unit = await tx.unit.findUniqueOrThrow({ where: { id: unitId }, select: { propertyCode: true } });

      // El monto se guarda siempre, exista o no un esquema todavía — el
      // reparto es información adicional, no un requisito para cargar
      // la venta. Sin esquema queda "sin repartir" y se completa después.
      const scheme = await tx.commissionScheme.findFirst({ where: { type: "VENTA" }, orderBy: { vigenteDesde: "desc" } });
      const reparto = scheme
        ? calcularReparto(commissionAmount, scheme, {
            vendedorPresente: !!vendedorAgentId,
            captadorPresente: !!captadorAgentId,
          })
        : { reservaAmount: null, agenteFijoAmount: null, vendedorAmount: null, captadorAmount: null, agenciaAmount: null };

      const created = await tx.sale.create({
        data: {
          unitId,
          sellerId,
          buyerId,
          initialPriceAmount,
          saleAmount,
          commissionAmount,
          currency,
          closedAt,
          vendedorAgentId,
          captadorAgentId,
          commissionSchemeId: scheme?.id,
          ...reparto,
          notes,
          createdById: profile.id,
        },
      });

      await crearCronogramaCobroEnTx(tx, {
        source: "VENTA",
        saleId: created.id,
        currency,
        cuotas,
        vendedorAgentId,
        descriptionBase: `Venta — ${unit.propertyCode}`,
        cashMovementSource: "VENTA",
      });

      return created;
    },
    { timeout: 30000, maxWait: 15000 }
    )
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/ventas");
  redirect(`/backoffice/caja/ventas/${sale.id}`);
}

// Marca una cuota de comisión (de Venta o de Alquiler — mismo mecanismo
// para las dos) como cobrada y recién ahí genera su movimiento de caja
// — antes de eso esa plata todavía no entró de verdad a la agencia (ver
// comentario en el modelo CommissionInstallment).
export async function marcarCuotaPagada(installmentId: number, formData: FormData) {
  await requirePermission("caja.ventas.crear");
  const method = requiredMethod(formData.get("method"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const installment = await tx.commissionInstallment.findUniqueOrThrow({
        where: { id: installmentId },
        include: {
          sale: { include: { unit: true } },
          rentalCommission: { include: { contract: { include: { unit: true } } } },
        },
      });
      if (installment.status === "PAGADA") return; // ya procesada, no duplicar el movimiento de caja

      await tx.commissionInstallment.update({
        where: { id: installmentId },
        data: { status: "PAGADA", paidAt: new Date(), method },
      });

      const isVenta = installment.source === "VENTA";
      const propertyCode = isVenta ? installment.sale!.unit.propertyCode : installment.rentalCommission!.contract.unit.propertyCode;
      const descriptionBase = isVenta ? `Venta — ${propertyCode}` : `Comisión de alquiler — ${propertyCode}`;
      const vendedorAgentId = isVenta ? installment.sale!.vendedorAgentId : installment.rentalCommission!.vendedorAgentId;

      await tx.cashMovement.create({
        data: {
          source: isVenta ? "VENTA" : "COMISION_ALQUILER",
          description:
            installment.totalCuotas > 1
              ? `${descriptionBase} (cuota ${installment.numeroCuota}/${installment.totalCuotas})`
              : descriptionBase,
          amount: installment.amount,
          currency: installment.currency,
          method,
          commissionInstallmentId: installment.id,
          vendedorAgentId,
        },
      });
    })
  );

  const installment = await withRetry(() =>
    prisma.commissionInstallment.findUniqueOrThrow({ where: { id: installmentId } })
  );
  if (installment.saleId) {
    revalidatePath(`/backoffice/caja/ventas/${installment.saleId}`);
  } else {
    revalidatePath("/backoffice/caja/comisiones");
  }
  revalidatePath("/backoffice/caja");
}

// Completa comprador/vendedor después del alta — a propósito no son
// obligatorios al cargar la venta (ver resolveClientOptional en
// crearVenta): a veces se sabe el negocio antes de tener los datos
// completos de las partes.
export async function actualizarPartesVenta(saleId: number, formData: FormData) {
  await requirePermission("caja.ventas.crear");

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const sellerId = await resolveClientOptional(tx, formData, "seller", "Parte vendedora");
      const buyerId = await resolveClientOptional(tx, formData, "buyer", "Comprador");
      await tx.sale.update({ where: { id: saleId }, data: { sellerId, buyerId } });
    })
  );

  revalidatePath(`/backoffice/caja/ventas/${saleId}`);
}

export async function crearTasacion(formData: FormData) {
  const profile = await requirePermission("caja.tasaciones.crear");

  const amount = requiredDecimal(formData.get("amount"), "Monto de tasación");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const completedAt = requiredDate(formData.get("completedAt"), "Fecha de tasación");
  const notes = optionalStr(formData.get("notes"));

  const hasAgentSplit = formData.get("hasAgentSplit") === "on";
  const vendedorAgentId = hasAgentSplit ? requiredStr(formData.get("agentId"), "Agente") : null;
  const agentSharePercent = hasAgentSplit ? "50" : null;
  const agentAmount = hasAgentSplit ? new Prisma.Decimal(amount).div(2).toFixed(2) : null;

  // Cargar la tasación no la da por cobrada por default — pero a
  // diferencia de antes de la última vuelta, si ya se sabe que se cobró
  // al cierre, se puede confirmar en el mismo paso en vez de forzar un
  // segundo viaje a confirmarCobroTasacion.
  const yaCobrada = formData.get("yaCobrada") === "on";
  const method = yaCobrada ? requiredMethod(formData.get("method")) : null;

  const appraisal = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const unitId = await resolveUnit(tx, formData);
      const unit = await tx.unit.findUniqueOrThrow({ where: { id: unitId }, select: { propertyCode: true } });

      const created = await tx.appraisal.create({
        data: {
          unitId,
          amount,
          currency,
          completedAt,
          vendedorAgentId,
          agentSharePercent,
          agentAmount,
          notes,
          createdById: profile.id,
        },
      });

      if (yaCobrada) {
        await tx.cashMovement.create({
          data: {
            source: "TASACION",
            description: `Tasación — ${unit.propertyCode}`,
            amount,
            currency,
            method,
            appraisalId: created.id,
            vendedorAgentId,
          },
        });
      }

      return created;
    })
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/tasaciones");
  redirect(`/backoffice/caja/tasaciones/${appraisal.id}`);
}

// Confirma que la inmobiliaria ya tiene en mano el cobro de la
// tasación — evento aparte de haberla hecho/cargado.
export async function confirmarCobroTasacion(appraisalId: number, formData: FormData) {
  await requirePermission("caja.tasaciones.confirmar");

  const method = requiredMethod(formData.get("method"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const appraisal = await tx.appraisal.findUniqueOrThrow({
        where: { id: appraisalId },
        include: { cashMovement: true, unit: true },
      });
      if (appraisal.cashMovement) {
        throw new Error("Ya se confirmó el cobro de esta tasación.");
      }

      await tx.cashMovement.create({
        data: {
          source: "TASACION",
          description: `Tasación — ${appraisal.unit.propertyCode}`,
          amount: appraisal.amount,
          currency: appraisal.currency,
          method,
          appraisalId: appraisal.id,
          vendedorAgentId: appraisal.vendedorAgentId,
        },
      });
    })
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/tasaciones");
  revalidatePath(`/backoffice/caja/tasaciones/${appraisalId}`);
}

// Un solo informe por tasación — volver a subir reemplaza la
// referencia (no queda historial de versiones anteriores).
export async function subirInformeTasacion(appraisalId: number, formData: FormData) {
  const profile = await requirePermission("caja.tasaciones.crear");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Elegí un archivo PDF");

  const { storagePath } = await uploadAppraisalReport(appraisalId, file);

  await withRetry(() =>
    prisma.appraisal.update({
      where: { id: appraisalId },
      data: {
        reportFileName: file.name,
        reportStoragePath: storagePath,
        reportUploadedAt: new Date(),
        reportUploadedById: profile.id,
      },
    })
  );

  revalidatePath(`/backoffice/caja/tasaciones/${appraisalId}`);
}

// Invocada desde la ficha de Contrato (no tiene página propia de alta —
// está atada 1:1 a un contrato existente). El @unique en
// RentalCommission.contractId actúa como guarda contra doble alta.
export async function crearComisionAlquiler(contractId: number, formData: FormData) {
  const profile = await requirePermission("caja.comisiones.crear");

  const amount = requiredDecimal(formData.get("amount"), "Comisión de alquiler");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const earnedAt = requiredDate(formData.get("earnedAt"), "Fecha");
  const vendedorAgentId = optionalStr(formData.get("vendedorAgentId"));
  const captadorAgentId = optionalStr(formData.get("captadorAgentId"));
  const notes = optionalStr(formData.get("notes"));

  await withRetry(() =>
    prisma.$transaction((tx) =>
      crearRentalCommissionEnTx(tx, {
        contractId,
        amount,
        currency,
        earnedAt,
        vendedorAgentId,
        captadorAgentId,
        notes,
        createdById: profile.id,
      })
    )
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/comisiones");
}

// Confirma que la inmobiliaria ya tiene en mano la comisión de alquiler
// (colocación o renovación) por el camino directo, sin cronograma — hoy
// lo sigue usando exclusivamente Renovación, que todavía no tiene
// esquema de cuotas propio (ver CommissionInstallmentSource, que a
// propósito no incluye RENOVACION). Colocación (origin ALQUILER) usa
// registrarCronogramaAlquiler en su lugar, aunque sea para una sola
// cuota "de contado".
export async function confirmarCobroComisionAlquiler(rentalCommissionId: number, formData: FormData) {
  await requirePermission("caja.comisiones.confirmar");

  const method = requiredMethod(formData.get("method"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const commission = await tx.rentalCommission.findUniqueOrThrow({
        where: { id: rentalCommissionId },
        include: { cashMovement: true },
      });
      if (commission.cashMovement) {
        throw new Error("Ya se confirmó el cobro de esta comisión.");
      }

      await tx.cashMovement.create({
        data: {
          source: commission.origin === "RENOVACION" ? "COMISION_RENOVACION" : "COMISION_ALQUILER",
          description: `${commission.origin === "RENOVACION" ? "Comisión de renovación" : "Comisión de alquiler"} — contrato #${commission.contractId}`,
          amount: commission.amount,
          currency: commission.currency,
          method,
          rentalCommissionId: commission.id,
          vendedorAgentId: commission.vendedorAgentId,
        },
      });
    })
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/comisiones");
}

// Define el cronograma de cobro (cuotas o "de contado") de una comisión
// de alquiler YA cargada — mismo mecanismo que Ventas (ver
// crearCronogramaCobroEnTx). El total NO se vuelve a pedir acá: ya
// quedó fijo en RentalCommission.amount al cargar la comisión, así que
// se lee de la base en vez de confiar en lo que venga del formulario.
export async function registrarCronogramaAlquiler(rentalCommissionId: number, formData: FormData) {
  await requirePermission("caja.comisiones.confirmar");

  const enCuotas = formData.get("enCuotas") === "on";

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const commission = await tx.rentalCommission.findUniqueOrThrow({
        where: { id: rentalCommissionId },
        include: { cashMovement: true, installments: true, contract: { include: { unit: true } } },
      });
      if (commission.cashMovement) throw new Error("Ya se confirmó el cobro de esta comisión.");
      if (commission.installments.length > 0) throw new Error("Esta comisión ya tiene un cronograma de cobro cargado.");

      const cuotas: CuotaEntrada[] = enCuotas
        ? installmentIndices(formData).map((i, idx) => {
            const yaCobrada = formData.get(`installments.${i}.yaCobrada`) === "on";
            return {
              amount: requiredDecimal(formData.get(`installments.${i}.amount`), `Monto cuota ${idx + 1}`),
              dueDate: requiredDate(formData.get(`installments.${i}.dueDate`), `Vencimiento cuota ${idx + 1}`),
              attributedTo: asCommissionParty(optionalStr(formData.get(`installments.${i}.attributedTo`)), ALQUILER_PARTIES),
              pagareFirmado: formData.get(`installments.${i}.pagareFirmado`) === "on",
              yaCobrada,
              method: yaCobrada
                ? requiredMethod(formData.get(`installments.${i}.method`), `Medio de cobro cuota ${idx + 1}`)
                : null,
            };
          })
        : [
            {
              amount: commission.amount,
              dueDate: new Date(),
              attributedTo: null,
              pagareFirmado: false,
              yaCobrada: true,
              method: requiredMethod(formData.get("method")),
            },
          ];
      if (cuotas.length === 0) throw new Error("Agregá al menos una cuota o destildá el pago en cuotas.");
      validarSumaCuotas(cuotas, commission.amount);

      await crearCronogramaCobroEnTx(tx, {
        source: "ALQUILER",
        rentalCommissionId: commission.id,
        currency: commission.currency,
        cuotas,
        vendedorAgentId: commission.vendedorAgentId,
        descriptionBase: `Comisión de alquiler — ${commission.contract.unit.propertyCode}`,
        cashMovementSource: "COMISION_ALQUILER",
      });
    })
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/comisiones");
}

// "Editar" el esquema desde el admin siempre inserta una versión nueva
// — nunca actualiza una existente — para que las operaciones ya
// cerradas (que congelan su propio reparto) no se vean afectadas.
// Confirma que la inmobiliaria ya tiene en mano su comisión de
// administración de esta liquidación — separado de que el inquilino
// haya pagado (Payment.status PAGADO), porque muchas veces difiere: el
// inquilino puede transferir directo al propietario, y la comisión se
// cobra en otro momento aparte. Recién acá se genera el CashMovement.
export async function confirmarCobroComision(paymentId: number, formData: FormData) {
  await requirePermission("caja.administracion.confirmar");

  const method = requiredMethod(formData.get("method"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: {
          items: { include: { concept: true } },
          contract: { include: { unit: true } },
          cashMovement: true,
        },
      });
      if (payment.status !== "PAGADO") {
        throw new Error("Esta liquidación todavía no está totalmente cobrada por el inquilino.");
      }
      if (payment.cashMovement) {
        throw new Error("Ya se confirmó el cobro de esta comisión.");
      }

      const { managementFee } = paymentBreakdown(payment.items, payment.contract.managementFeePercent);
      if (managementFee <= 0) return;

      await tx.cashMovement.create({
        data: {
          source: "ADMINISTRACION",
          description: `Administración — ${payment.contract.unit.propertyCode} (${payment.periodMonth}/${payment.periodYear})`,
          amount: managementFee,
          currency: payment.currency,
          method,
          paymentId: payment.id,
          vendedorAgentId: payment.contract.vendedorAgentId,
        },
      });
    })
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/administracion");
}

// Catálogo abierto: se crean categorías sobre la marcha (Alquiler
// oficina, Sueldos, Luz...), sin tocar código. "Pagos a agentes" NO es
// una categoría acá — ese gasto ya existe como dato (AgentDebtPayment)
// y se suma aparte en los reportes de Caja.
export async function crearCategoriaGasto(formData: FormData) {
  await requirePermission("caja.gastos.crear");

  const name = requiredStr(formData.get("name"), "Nombre de la categoría");
  const type = requiredStr(formData.get("type"), "Tipo") as ExpenseType;
  if (type !== "FIJO" && type !== "VARIABLE") throw new Error("Tipo de gasto inválido");

  await withRetry(() => prisma.expenseCategory.create({ data: { name, type } }));

  revalidatePath("/backoffice/caja/egresos");
}

export async function registrarGasto(formData: FormData) {
  const profile = await requirePermission("caja.gastos.crear");

  const categoryId = Number(requiredStr(formData.get("categoryId"), "Categoría"));
  const amount = requiredDecimal(formData.get("amount"), "Monto");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const occurredAt = optionalStr(formData.get("occurredAt"))
    ? requiredDate(formData.get("occurredAt"), "Fecha")
    : new Date();
  const methodRaw = optionalStr(formData.get("method"));
  const method = methodRaw === "EFECTIVO" || methodRaw === "TRANSFERENCIA" ? (methodRaw as PaymentMethod) : null;
  const notes = optionalStr(formData.get("notes"));

  await withRetry(() =>
    prisma.expense.create({
      data: { categoryId, amount, currency, occurredAt, method, notes, createdById: profile.id },
    })
  );

  revalidatePath("/backoffice/caja/egresos");
  revalidatePath("/backoffice/caja/consolidado");
}

// El % de corrección es un supuesto de mercado (cuánto suele indexar),
// no una constante de código — editable acá mismo para no depender de
// un cambio de código cada vez que cambie el contexto económico.
export async function guardarProjectionSettings(formData: FormData) {
  await requirePermission("caja.proyeccion.configurar");

  const min = requiredDecimal(formData.get("indexationCorrectionMinPercent"), "% mínimo");
  const max = requiredDecimal(formData.get("indexationCorrectionMaxPercent"), "% máximo");
  if (Number(min) < 0 || Number(max) < 0) throw new Error("Los porcentajes no pueden ser negativos.");
  if (Number(min) > Number(max)) throw new Error("El % mínimo no puede ser mayor al máximo.");

  await prisma.projectionSettings.upsert({
    where: { id: 1 },
    create: { id: 1, indexationCorrectionMinPercent: min, indexationCorrectionMaxPercent: max },
    update: { indexationCorrectionMinPercent: min, indexationCorrectionMaxPercent: max },
  });

  revalidatePath("/backoffice/caja/proyeccion");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission, requireAnyPermission } from "@/lib/auth";
import { resolveClient, resolveUnit } from "@/lib/backoffice-resolvers";
import { uploadAppraisalReport } from "@/lib/supabase/storage";
import { paymentBreakdown } from "@/lib/alquileres";
import { calcularReparto, crearRentalCommissionEnTx } from "@/lib/comisiones";
import { getActiveCommissionScheme, toRepartoSchemeInfo } from "@/lib/caja";
import { optionalDecimal, optionalStr, requiredDate, requiredDecimal, requiredStr } from "@/lib/form-utils";
import { Prisma, type CommissionSchemeType, type ExpenseType, type PaymentMethod } from "@/generated/prisma/client";

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

function asPagareSigner(v: string | null): "COMPRADOR" | "VENDEDOR" | null {
  return v === "COMPRADOR" || v === "VENDEDOR" ? v : null;
}

export async function crearVenta(formData: FormData) {
  const profile = await requirePermission("caja.ventas.crear");

  const initialPriceAmount = optionalDecimal(formData.get("initialPriceAmount"));
  const saleAmount = optionalDecimal(formData.get("saleAmount"));
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const closedAt = requiredDate(formData.get("closedAt"), "Fecha de cierre");
  const vendedorAgentId = optionalStr(formData.get("vendedorAgentId"));
  const captadorAgentId = optionalStr(formData.get("captadorAgentId"));
  const notes = optionalStr(formData.get("notes"));

  // La comisión siempre se cobra a través de cuotas — "de contado" es
  // simplemente una sola cuota que ya se da por cobrada hoy. Así el
  // mismo mecanismo (SaleCommissionInstallment) cubre ambos casos y la
  // Caja nunca ve plata que todavía no entró de verdad.
  const enCuotas = formData.get("enCuotas") === "on";
  const cuotasInput = enCuotas
    ? installmentIndices(formData).map((i, idx) => ({
        amount: requiredDecimal(formData.get(`installments.${i}.amount`), `Monto cuota ${idx + 1}`),
        dueDate: requiredDate(formData.get(`installments.${i}.dueDate`), `Vencimiento cuota ${idx + 1}`),
        pagareSignedBy: asPagareSigner(optionalStr(formData.get(`installments.${i}.pagareSignedBy`))),
      }))
    : [
        {
          amount: requiredDecimal(formData.get("commissionAmount"), "Comisión de venta"),
          dueDate: closedAt,
          pagareSignedBy: null,
        },
      ];
  if (cuotasInput.length === 0) {
    throw new Error("Agregá al menos una cuota o destildá el pago en cuotas.");
  }
  const commissionAmount = cuotasInput
    .reduce((sum, c) => sum.add(new Prisma.Decimal(c.amount)), new Prisma.Decimal(0))
    .toFixed(2);

  const sale = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const sellerId = await resolveClient(tx, formData, "seller", "Parte vendedora");
      const buyerId = await resolveClient(tx, formData, "buyer", "Comprador");
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

      const totalCuotas = cuotasInput.length;
      for (let i = 0; i < cuotasInput.length; i++) {
        const cuota = cuotasInput[i];
        // Sin cuotas (pago único) se da por cobrada en el momento, igual
        // que el comportamiento de antes de que existiera este cronograma.
        const yaCobrada = !enCuotas;

        const installment = await tx.saleCommissionInstallment.create({
          data: {
            saleId: created.id,
            numeroCuota: i + 1,
            totalCuotas,
            amount: cuota.amount,
            dueDate: cuota.dueDate,
            pagareSignedBy: cuota.pagareSignedBy,
            status: yaCobrada ? "PAGADA" : "PENDIENTE",
            paidAt: yaCobrada ? closedAt : null,
          },
        });

        if (yaCobrada) {
          await tx.cashMovement.create({
            data: {
              source: "VENTA",
              description: `Venta — ${unit.propertyCode}`,
              amount: cuota.amount,
              currency,
              occurredAt: closedAt,
              saleCommissionInstallmentId: installment.id,
            },
          });
        }
      }

      return created;
    })
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/ventas");
  redirect(`/backoffice/caja/ventas/${sale.id}`);
}

// Marca una cuota de comisión como cobrada y recién ahí genera su
// movimiento de caja — antes de eso esa plata todavía no entró de
// verdad a la agencia (ver comentario en el modelo SaleCommissionInstallment).
export async function marcarCuotaPagada(installmentId: number) {
  await requirePermission("caja.ventas.crear");

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const installment = await tx.saleCommissionInstallment.findUniqueOrThrow({
        where: { id: installmentId },
        include: { sale: { include: { unit: true } } },
      });
      if (installment.status === "PAGADA") return; // ya procesada, no duplicar el movimiento de caja

      await tx.saleCommissionInstallment.update({
        where: { id: installmentId },
        data: { status: "PAGADA", paidAt: new Date() },
      });

      await tx.cashMovement.create({
        data: {
          source: "VENTA",
          description: `Venta — ${installment.sale.unit.propertyCode} (cuota ${installment.numeroCuota}/${installment.totalCuotas})`,
          amount: installment.amount,
          currency: installment.sale.currency,
          saleCommissionInstallmentId: installment.id,
        },
      });
    })
  );

  const installment = await withRetry(() =>
    prisma.saleCommissionInstallment.findUniqueOrThrow({ where: { id: installmentId } })
  );
  revalidatePath(`/backoffice/caja/ventas/${installment.saleId}`);
  revalidatePath("/backoffice/caja");
}

export async function crearTasacion(formData: FormData) {
  const profile = await requirePermission("caja.tasaciones.crear");

  const amount = requiredDecimal(formData.get("amount"), "Monto de tasación");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const completedAt = requiredDate(formData.get("completedAt"), "Fecha de tasación");
  const notes = optionalStr(formData.get("notes"));

  const hasAgentSplit = formData.get("hasAgentSplit") === "on";
  const agentId = hasAgentSplit ? requiredStr(formData.get("agentId"), "Agente") : null;
  const agentSharePercent = hasAgentSplit ? "50" : null;
  const agentAmount = hasAgentSplit ? new Prisma.Decimal(amount).div(2).toFixed(2) : null;

  // No crea el CashMovement acá: hacer la tasación y cobrarla suelen ser
  // momentos distintos, igual que Ventas (cuotas) o Comisión de
  // alquiler — ver confirmarCobroTasacion.
  const appraisal = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const unitId = await resolveUnit(tx, formData);

      return tx.appraisal.create({
        data: { unitId, amount, currency, completedAt, agentId, agentSharePercent, agentAmount, notes, createdById: profile.id },
      });
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

  const method = requiredStr(formData.get("method"), "Medio de cobro") as "EFECTIVO" | "TRANSFERENCIA";
  if (method !== "EFECTIVO" && method !== "TRANSFERENCIA") throw new Error("Medio de cobro inválido");

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
// (colocación o renovación) — evento aparte de cargarla: colocamos el
// alquiler y devengamos la comisión ese día, pero no necesariamente se
// cobra en el momento. Recién acá se genera el CashMovement, igual
// criterio que confirmarCobroComision para Administración.
export async function confirmarCobroComisionAlquiler(rentalCommissionId: number, formData: FormData) {
  await requirePermission("caja.comisiones.confirmar");

  const method = requiredStr(formData.get("method"), "Medio de cobro") as "EFECTIVO" | "TRANSFERENCIA";
  if (method !== "EFECTIVO" && method !== "TRANSFERENCIA") throw new Error("Medio de cobro inválido");

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
        },
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

  const method = requiredStr(formData.get("method"), "Medio de cobro") as "EFECTIVO" | "TRANSFERENCIA";
  if (method !== "EFECTIVO" && method !== "TRANSFERENCIA") throw new Error("Medio de cobro inválido");

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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { addMonths, buildPaymentSchedule, computeEndDate, paymentTotal } from "@/lib/alquileres";
import { resolveClient, resolveClientOptional, resolveUnit } from "@/lib/backoffice-resolvers";
import { uploadContractDocument, deleteContractDocuments } from "@/lib/supabase/storage";
import { crearRentalCommissionEnTx } from "@/lib/comisiones";
import {
  optionalDecimal,
  optionalInt,
  optionalStr,
  requiredDate,
  requiredDecimal,
  requiredStr,
} from "@/lib/form-utils";
import type { DocumentType, Prisma } from "@/generated/prisma/client";

function guarantorIndices(formData: FormData): number[] {
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^guarantors\.(\d+)\./);
    if (match) indices.add(Number(match[1]));
  }
  return [...indices].sort((a, b) => a - b);
}

// Una colocación FIRMADA queda cerrada — partes y agentes ya no se
// tocan más (si hay que corregir algo, es "eliminar definitivamente" y
// recargar, ver eliminarContratoDefinitivo). No aplica a un contrato
// administrado: ese sigue su propio ciclo (ACTIVO/FINALIZADO/...), acá
// solo se corta cuando es una colocación (isAdministered false) ya
// firmada.
async function assertColocacionEditable(tx: Prisma.TransactionClient, contractId: number) {
  const contract = await tx.contract.findUniqueOrThrow({
    where: { id: contractId },
    select: { isAdministered: true, status: true },
  });
  if (!contract.isAdministered && contract.status === "FIRMADO") {
    throw new Error("Esta colocación ya está firmada — no se puede editar. Si hay que corregir algo, eliminala y volvé a cargarla.");
  }
}

export async function buscarClientes(query: string) {
  await requirePermission("administraciones.crear");
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

export async function buscarUnidades(query: string) {
  await requirePermission("administraciones.crear");
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

export async function createContract(formData: FormData) {
  const profile = await requirePermission("administraciones.crear");

  const startDate = requiredDate(formData.get("startDate"), "Fecha de inicio");
  const durationMonths = optionalInt(formData.get("durationMonths"));
  if (!durationMonths || durationMonths <= 0) throw new Error("La duración debe ser un número de meses mayor a 0");
  const endDate = computeEndDate(startDate, durationMonths);

  const rentAmount = requiredDecimal(formData.get("rentAmount"), "Monto del alquiler");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const isAdministered = formData.get("isAdministered") === "on";
  const managementFeePercent = isAdministered
    ? requiredDecimal(formData.get("managementFeePercent"), "Comisión de administración")
    : null;
  const indexationFrequencyMonths = isAdministered ? optionalInt(formData.get("indexationFrequencyMonths")) : null;
  const indexTypeId = isAdministered ? optionalInt(formData.get("indexTypeId")) : null;
  const conceptIds = formData
    .getAll("concepts")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  const guarantorIdxs = guarantorIndices(formData);
  const renewedFromContractId = optionalInt(formData.get("renewedFromContractId"));
  const paymentAlias = optionalStr(formData.get("paymentAlias"));
  const paymentCBU = optionalStr(formData.get("paymentCBU"));

  // Día de vencimiento del alquiler mensual — lo pacta cada contrato,
  // nunca se deriva del día en que arrancó (ver comentario en
  // buildPaymentSchedule). Si se deja vacío, cae al día de `startDate`
  // como fallback (mismo comportamiento que había antes de este campo).
  const paymentDueDayRaw = optionalInt(formData.get("paymentDueDay"));
  if (paymentDueDayRaw !== null && (paymentDueDayRaw < 1 || paymentDueDayRaw > 31)) {
    throw new Error("El día de vencimiento debe estar entre 1 y 31.");
  }
  const paymentDueDay = paymentDueDayRaw ?? startDate.getUTCDate();

  // El inquilino transfiere la comisión de administración directo a la
  // inmobiliaria (por separado de lo que le paga al propietario) — ver
  // comentario en el modelo Contract. Solo tiene sentido si se administra.
  const tenantPaysCommission = isAdministered && formData.get("tenantPaysCommission") === "on";
  const commissionAlias = tenantPaysCommission ? optionalStr(formData.get("commissionAlias")) : null;
  const commissionCBU = tenantPaysCommission ? optionalStr(formData.get("commissionCBU")) : null;

  // "A confirmar" (sin marcar) queda como null a propósito — recién se
  // sabe si esta renovación puntual va a cobrar comisión o no, y eso se
  // puede definir en cualquier momento, no solo al crear el contrato.
  const renewalCommissionExpectedRaw = optionalStr(formData.get("renewalCommissionExpected"));
  const renewalCommissionExpected =
    renewalCommissionExpectedRaw === "true" ? true : renewalCommissionExpectedRaw === "false" ? false : null;

  // Quién colocó este alquiler — siempre se puede cargar, haya o no una
  // comisión de colocación cobrada en este mismo paso (ver fieldset
  // "Agentes", separado del checkbox de comisión).
  const vendedorAgentId = optionalStr(formData.get("vendedorAgentId"));
  const captadorAgentId = optionalStr(formData.get("captadorAgentId"));

  // Comisión de colocación, opcional — se carga en el mismo alta si el
  // checkbox de ComisionAlquilerFields estaba tildado.
  const commissionAmount = optionalDecimal(formData.get("commissionAmount"));
  if (commissionAmount && !profile.permissions.includes("caja.comisiones.crear")) {
    throw new Error("No tenés permiso para cargar comisiones de alquiler.");
  }
  const commissionCurrency = optionalStr(formData.get("commissionCurrency")) ?? currency;
  const earnedAt = optionalStr(formData.get("earnedAt")) ? requiredDate(formData.get("earnedAt"), "Fecha de cierre") : startDate;

  const contract = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      // A propósito tolerante — a veces se conoce el negocio (unidad,
      // monto, comisión) antes de tener los datos completos de las
      // partes; se completan después desde la ficha del contrato (ver
      // actualizarPartesContrato).
      const ownerId = await resolveClientOptional(tx, formData, "owner", "Propietario");
      const tenantId = await resolveClientOptional(tx, formData, "tenant", "Inquilino");
      const unitId = await resolveUnit(tx, formData);

      // Una renovación hereda el grupo del contrato que renueva — sigue
      // siendo la misma cartera hasta que alguien lo reasigne a mano.
      const groupId = renewedFromContractId
        ? (await tx.contract.findUnique({ where: { id: renewedFromContractId }, select: { groupId: true } }))
            ?.groupId ?? null
        : null;

      const createdContract = await tx.contract.create({
        data: {
          unitId,
          ownerId,
          tenantId,
          startDate,
          durationMonths,
          endDate,
          rentAmount,
          currency,
          // Una colocación no tiene el ciclo de vida de un alquiler
          // administrado (nunca pasa por ACTIVO) — es un hecho puntual:
          // se cargó (BORRADOR, todavía editable) y alguien la marca
          // como firmada después (ver marcarContratoFirmado).
          status: isAdministered ? "ACTIVO" : "BORRADOR",
          isAdministered,
          managementFeePercent,
          indexationFrequencyMonths,
          indexTypeId,
          nextIndexationDueAt: indexationFrequencyMonths ? addMonths(startDate, indexationFrequencyMonths) : null,
          notes: optionalStr(formData.get("notes")),
          paymentAlias,
          paymentCBU,
          paymentDueDay,
          tenantPaysCommission,
          commissionAlias,
          commissionCBU,
          renewedFromContractId,
          renewalCommissionExpected,
          groupId,
          vendedorAgentId,
          captadorAgentId,
          createdById: profile.id,
        },
      });

      if (guarantorIdxs.length > 0) {
        const guarantorClientIds = [];
        for (const i of guarantorIdxs) {
          guarantorClientIds.push(await resolveClient(tx, formData, `guarantors.${i}`, `Garante ${i + 1}`));
        }
        await tx.contractGuarantor.createMany({
          data: guarantorClientIds.map((clientId) => ({ contractId: createdContract.id, clientId })),
          skipDuplicates: true,
        });
      }

      if (conceptIds.length > 0) {
        await tx.contractConcept.createMany({
          data: conceptIds.map((conceptId) => ({ contractId: createdContract.id, conceptId })),
        });
      }

      // Sin administración no hay cronograma de liquidaciones — el
      // contrato queda solo como el registro del alquiler que cerramos.
      if (isAdministered) {
        const alquilerConcept = await tx.concept.findFirstOrThrow({ where: { isSystem: true } });
        const schedule = buildPaymentSchedule(startDate, durationMonths, paymentDueDay);

        // Todo en bloque (createMany + un findMany para recuperar los ids)
        // en vez de una fila a la vez: con contratos largos (24 meses x
        // varios conceptos) ir fila por fila en una sola transacción supera
        // el timeout dada la latencia que tiene esta conexión.
        await tx.payment.createMany({
          data: schedule.map((period) => ({ contractId: createdContract.id, ...period, currency })),
        });

        const createdPayments = await tx.payment.findMany({
          where: { contractId: createdContract.id },
          select: { id: true, periodYear: true, periodMonth: true },
        });
        const paymentIdByPeriod = new Map(
          createdPayments.map((p) => [`${p.periodYear}-${p.periodMonth}`, p.id])
        );

        const itemsData: { paymentId: number; conceptId: number; amount: string | null }[] = [];
        for (const period of schedule) {
          const paymentId = paymentIdByPeriod.get(`${period.periodYear}-${period.periodMonth}`)!;
          itemsData.push({ paymentId, conceptId: alquilerConcept.id, amount: rentAmount });
          for (const conceptId of conceptIds) {
            itemsData.push({ paymentId, conceptId, amount: null });
          }
        }
        await tx.paymentItem.createMany({ data: itemsData });
      }

      if (commissionAmount) {
        // La renovación es una unidad de negocio sin reparto por agente
        // todavía (ver RentalCommission.origin) — vendedorAgentId/
        // captadorAgentId de acá arriba son la atribución del contrato,
        // no necesariamente quién corresponde a esta comisión puntual.
        await crearRentalCommissionEnTx(tx, {
          contractId: createdContract.id,
          amount: commissionAmount,
          currency: commissionCurrency,
          earnedAt,
          vendedorAgentId: renewedFromContractId ? null : vendedorAgentId,
          captadorAgentId: renewedFromContractId ? null : captadorAgentId,
          createdById: profile.id,
        });
      }

      return createdContract;
    },
    { timeout: 30000, maxWait: 15000 }
    )
  );

  // Los documentos se suben después de que el contrato ya quedó guardado
  // — un PDF que falla al subir nunca debe hacer perder el alta. Cada
  // archivo es opcional e independiente de los demás.
  const documentFields: { field: string; type: DocumentType }[] = [
    { field: "contratoFile", type: "CONTRATO" },
    { field: "dniInquilinoFile", type: "DNI_INQUILINO" },
    { field: "dniGaranteFile", type: "DNI_GARANTE" },
    { field: "otroFile", type: "OTRO" },
  ];

  for (const { field, type } of documentFields) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;

    try {
      const { storagePath } = await uploadContractDocument(contract.id, file);
      await withRetry(() =>
        prisma.contractDocument.create({
          data: { contractId: contract.id, type, fileName: file.name, storagePath, uploadedById: profile.id },
        })
      );
    } catch (err) {
      console.error(`No se pudo subir ${field} para el contrato ${contract.id}:`, err);
    }
  }

  revalidatePath("/backoffice/administraciones");
  redirect(`/backoffice/administraciones/${contract.id}`);
}

// Completa propietario/inquilino después del alta — a propósito no son
// obligatorios al cargar el contrato (ver resolveClientOptional en
// createContract): a veces se sabe el negocio antes de tener los datos
// completos de las partes.
export async function actualizarPartesContrato(contractId: number, formData: FormData) {
  await requirePermission("administraciones.crear");

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      await assertColocacionEditable(tx, contractId);
      const ownerId = await resolveClientOptional(tx, formData, "owner", "Propietario");
      const tenantId = await resolveClientOptional(tx, formData, "tenant", "Inquilino");
      await tx.contract.update({ where: { id: contractId }, data: { ownerId, tenantId } });
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
  revalidatePath("/backoffice/administraciones");
}

export async function crearConcepto(name: string) {
  await requirePermission("administraciones.crear");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre del concepto no puede estar vacío");

  const concept = await withRetry(() =>
    prisma.concept.upsert({ where: { name: trimmed }, create: { name: trimmed }, update: {} })
  );
  revalidatePath("/backoffice/administraciones/nuevo");
  return concept;
}

export async function crearIndexType(code: string) {
  await requirePermission("administraciones.crear");
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) throw new Error("El código del índice no puede estar vacío");

  const indexType = await withRetry(() =>
    prisma.indexType.upsert({ where: { code: trimmed }, create: { code: trimmed }, update: {} })
  );
  revalidatePath("/backoffice/administraciones/nuevo");
  return indexType;
}

export async function subirDocumento(contractId: number, formData: FormData) {
  const profile = await requirePermission("administraciones.crear");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Elegí un archivo PDF");
  const type = requiredStr(formData.get("type"), "Tipo de documento") as DocumentType;

  const { storagePath } = await uploadContractDocument(contractId, file);

  await withRetry(() =>
    prisma.contractDocument.create({
      data: { contractId, type, fileName: file.name, storagePath, uploadedById: profile.id },
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
}

export async function guardarLiquidacion(paymentId: number, formData: FormData) {
  await requirePermission("administraciones.pagos");

  const itemIds = formData
    .getAll("itemId")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      // Una vez enviada (o cobrada) los montos quedan congelados — hay que
      // reabrirla explícitamente para volver a tocarlos, así lo que ya
      // se mandó al inquilino no cambia por una carga tardía.
      if (payment.status !== "PENDIENTE") {
        throw new Error("Esta liquidación ya está enviada — reabrila para poder editarla.");
      }

      await Promise.all(
        itemIds.map((itemId) =>
          tx.paymentItem.update({
            where: { id: itemId },
            data: {
              amount: (() => {
                const raw = formData.get(`amount.${itemId}`);
                const s = typeof raw === "string" ? raw.trim() : "";
                return s.length > 0 ? s : null;
              })(),
              notes: optionalStr(formData.get(`notes.${itemId}`)),
            },
          })
        )
      );
    })
  );

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));
  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
}

// Agrega un concepto puntual a ESTA liquidación (ej. "Mora" solo el mes
// que se pagó tarde) — a diferencia de los conceptos recurrentes del
// contrato (Expensas, Agua...), que salen en todos los períodos, este
// es caso por caso. Reutiliza el catálogo de Concept (upsert por
// nombre) para no duplicar "Mora" como texto suelto cada vez.
export async function agregarConceptoLiquidacion(paymentId: number, formData: FormData) {
  await requirePermission("administraciones.pagos");

  const conceptName = requiredStr(formData.get("conceptName"), "Concepto");
  const rawAmount = optionalDecimal(formData.get("amount"));
  // "Descuento" (ej. el inquilino se hizo cargo de un gasto del
  // propietario ese mes) resta del total en vez de sumar — nunca se le
  // pide a quien carga que tipee el signo, se toma el valor absoluto y
  // se le aplica el signo según el tipo elegido.
  const isDiscount = formData.get("itemType") === "DESCUENTO";
  const amount = rawAmount === null ? null : isDiscount ? (-Math.abs(Number(rawAmount))).toFixed(2) : rawAmount;

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (payment.status !== "PENDIENTE") {
        throw new Error("Esta liquidación ya está enviada — reabrila para poder agregar conceptos.");
      }

      const concept = await tx.concept.upsert({
        where: { name: conceptName.trim() },
        create: { name: conceptName.trim() },
        update: {},
      });

      const existing = await tx.paymentItem.findFirst({ where: { paymentId, conceptId: concept.id } });
      if (existing) {
        throw new Error(`Esta liquidación ya tiene un ítem de "${concept.name}".`);
      }

      await tx.paymentItem.create({ data: { paymentId, conceptId: concept.id, amount } });
    })
  );

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));
  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
}

// Saca un concepto puntual de esta liquidación (ej. si se agregó Mora
// por error) — nunca el de Alquiler, que es obligatorio.
export async function quitarConceptoLiquidacion(paymentId: number, itemId: number) {
  await requirePermission("administraciones.pagos");

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (payment.status !== "PENDIENTE") {
        throw new Error("Esta liquidación ya está enviada — reabrila para poder quitar conceptos.");
      }

      const item = await tx.paymentItem.findUniqueOrThrow({ where: { id: itemId }, include: { concept: true } });
      if (item.concept.isSystem) {
        throw new Error("No se puede quitar el concepto de Alquiler.");
      }

      await tx.paymentItem.delete({ where: { id: itemId } });
    })
  );

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));
  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
}

// Congela los montos cargados y deja la liquidación lista para mandarle
// al inquilino (ver el PDF exportable) — el paso intermedio entre "la
// estoy armando" y "ya la cobré" que antes no existía.
export async function marcarLiquidacionEnviada(paymentId: number) {
  await requirePermission("administraciones.pagos");

  await withRetry(() =>
    prisma.payment.updateMany({
      where: { id: paymentId, status: "PENDIENTE" },
      data: { status: "ENVIADA", sentAt: new Date() },
    })
  );

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));
  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
  revalidatePath(`/backoffice/administraciones/${payment.contractId}`);
}

// Vuelve una liquidación enviada a Pendiente para poder corregir un
// monto antes de que se cobre — no aplica una vez que ya recibió algún
// cobro (Parcial o Pagada), porque ahí ya hay plata real de por medio.
export async function reabrirLiquidacion(paymentId: number) {
  await requirePermission("administraciones.pagos");

  await withRetry(() =>
    prisma.payment.updateMany({
      where: { id: paymentId, status: "ENVIADA" },
      data: { status: "PENDIENTE", sentAt: null },
    })
  );

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));
  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
  revalidatePath(`/backoffice/administraciones/${payment.contractId}`);
}

// Registra un cobro contra la liquidación — total o parcial, según si
// el monto ingresado (sumado a lo ya cobrado antes) llega al total o
// no. La comisión de administración (CashMovement) recién se reconoce
// cuando el acumulado llega al total: no se prorratea por cada cobro
// parcial, para no inventar un criterio de a qué concepto (alquiler,
// expensas...) corresponde cada pago parcial.
export async function registrarCobro(paymentId: number, formData: FormData) {
  await requirePermission("administraciones.pagos");

  const amount = requiredDecimal(formData.get("amount"), "Monto cobrado");
  const paidAt = optionalStr(formData.get("paidAt")) ? requiredDate(formData.get("paidAt"), "Fecha") : new Date();
  const method = requiredStr(formData.get("method"), "Medio de cobro") as "EFECTIVO" | "TRANSFERENCIA";
  if (method !== "EFECTIVO" && method !== "TRANSFERENCIA") throw new Error("Medio de cobro inválido");
  const notes = optionalStr(formData.get("notes"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { items: true, partialPayments: true },
      });
      if (payment.status === "PAGADO") {
        throw new Error("Esta liquidación ya está pagada.");
      }

      await tx.paymentPartialPayment.create({ data: { paymentId, amount, paidAt, method, notes } });

      // El total de la liquidación (lo que paga el inquilino) es
      // independiente de si la inmobiliaria ya tiene en mano su propia
      // comisión de administración — eso se confirma aparte en Caja >
      // Administración (confirmarCobroComision), porque muchas veces el
      // inquilino transfiere directo al propietario y ese cobro llega
      // en otro momento.
      const total = paymentTotal(payment.items);
      const cobradoAcumulado = payment.partialPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        Number(amount)
      );

      await tx.payment.update({
        where: { id: paymentId },
        data:
          cobradoAcumulado >= total
            ? { status: "PAGADO", paidAt, paidAmount: cobradoAcumulado }
            : { status: "PARCIAL", paidAmount: cobradoAcumulado },
      });
    })
  );

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));
  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
  revalidatePath(`/backoffice/administraciones/${payment.contractId}`);
  revalidatePath("/backoffice/caja");
}

// Registra que la inmobiliaria le entregó al propietario el neto de esta
// liquidación — evento propio, posterior e independiente de que el
// inquilino haya pagado (registrarCobro) y de que se haya confirmado el
// cobro de la comisión (confirmarCobroComision): suelen pasar en
// momentos distintos. No admite parcial, es un solo evento.
export async function registrarPagoPropietario(paymentId: number, formData: FormData) {
  await requirePermission("administraciones.pagos");

  const paidAt = optionalStr(formData.get("ownerPaidAt"))
    ? requiredDate(formData.get("ownerPaidAt"), "Fecha")
    : new Date();
  const method = requiredStr(formData.get("method"), "Medio de pago") as "EFECTIVO" | "TRANSFERENCIA";
  if (method !== "EFECTIVO" && method !== "TRANSFERENCIA") throw new Error("Medio de pago inválido");

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (payment.status !== "PAGADO") {
        throw new Error("Esta liquidación todavía no está totalmente cobrada por el inquilino.");
      }
      if (payment.ownerPaidAt) {
        throw new Error("Ya se registró el pago al propietario.");
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: { ownerPaidAt: paidAt, ownerPaymentMethod: method },
      });
    })
  );

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));
  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
  revalidatePath(`/backoffice/administraciones/${payment.contractId}`);
  revalidatePath("/backoffice/administraciones/liquidaciones");
}

export async function aplicarIndexacion(contractId: number, formData: FormData) {
  await requirePermission("administraciones.indexacion");

  const newAmount = requiredDecimal(formData.get("newAmount"), "Nuevo monto");
  const indexTypeId = optionalInt(formData.get("indexTypeId"));
  const notes = optionalStr(formData.get("notes"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUniqueOrThrow({ where: { id: contractId } });

      await tx.indexation.create({
        data: { contractId, previousAmount: contract.rentAmount, newAmount, indexTypeId, notes },
      });

      const now = new Date();
      // Punto de corte: el período que realmente correspondía actualizar
      // (nextIndexationDueAt tal como estaba antes de este alta), no
      // "ahora" — si el corte fuera la fecha real, un contrato con
      // muchos períodos pendientes por delante terminaría cambiando el
      // monto de todos ellos en vez de solo los que vencen en o después
      // del mes que tocaba actualizar. Sin esquema de indexación
      // (ajuste manual puntual) no hay una fecha de referencia, así que
      // ahí sí el corte es "ahora".
      const cutoff = contract.nextIndexationDueAt ?? now;

      await tx.contract.update({
        where: { id: contractId },
        data: {
          rentAmount: newAmount,
          lastIndexedAt: now,
          // La PRÓXIMA actualización se cuenta desde `cutoff` (el
          // cronograma real del contrato), no desde `now` — si contara
          // desde "ahora", cargar esta actualización con un día de
          // atraso (o probarla el mismo día del alta) correría todo el
          // cronograma siguiente esa misma cantidad, arrastrando el
          // desfasaje para siempre y desalineando cada corte futuro del
          // que realmente le corresponde al contrato.
          nextIndexationDueAt: contract.indexationFrequencyMonths
            ? addMonths(cutoff, contract.indexationFrequencyMonths)
            : null,
        },
      });

      const alquilerConcept = await tx.concept.findFirstOrThrow({ where: { isSystem: true } });

      // Tampoco toca lo ya pagado ni lo vencido antes del corte.
      const futurePendingPayments = await tx.payment.findMany({
        where: { contractId, status: "PENDIENTE", dueDate: { gte: cutoff } },
        select: { id: true },
      });

      await tx.paymentItem.updateMany({
        where: {
          conceptId: alquilerConcept.id,
          paymentId: { in: futurePendingPayments.map((p) => p.id) },
        },
        data: { amount: newAmount },
      });
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
}

export async function finalizarContrato(contractId: number, formData: FormData) {
  await requirePermission("administraciones.crear");

  const status = requiredStr(formData.get("status"), "Estado") as "FINALIZADO" | "RESCINDIDO";
  if (status !== "FINALIZADO" && status !== "RESCINDIDO") {
    throw new Error("Estado inválido");
  }
  const terminationReason = optionalStr(formData.get("terminationReason"));
  const terminatedAt = new Date();

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contractId },
        data: { status, terminatedAt, terminationReason },
      });

      // Los períodos posteriores a la baja (ej. rescindir a mitad de
      // contrato) nunca van a liquidarse — el inquilino ya se fue. Se
      // borran solo si todavía no tuvieron actividad real (Pendiente);
      // uno ya Enviado/Parcial/Pagado queda como está, no se pierde ese
      // registro. En un contrato que termina en su fecha natural esto
      // no borra nada, porque ya no quedan períodos futuros.
      await tx.payment.deleteMany({
        where: { contractId, status: "PENDIENTE", dueDate: { gt: terminatedAt } },
      });
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
  revalidatePath("/backoffice/administraciones");
  revalidatePath("/backoffice/administraciones/liquidaciones");
}

// Cierra una colocación (isAdministered false) — el encargado de
// coordinar el cierre con la escribana confirma que ya se firmó. A
// partir de acá, partes y agentes quedan bloqueados (ver
// assertColocacionEditable); el cobro de la comisión de colocación
// sigue funcionando exactamente igual, nunca se bloquea.
export async function marcarContratoFirmado(contractId: number) {
  await requirePermission("administraciones.firmar");

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUniqueOrThrow({
        where: { id: contractId },
        select: { isAdministered: true, status: true },
      });
      if (contract.isAdministered) {
        throw new Error("Un contrato administrado no usa este estado — esto es solo para colocaciones.");
      }
      if (contract.status !== "BORRADOR") {
        throw new Error("Esta colocación ya está firmada.");
      }
      await tx.contract.update({ where: { id: contractId }, data: { status: "FIRMADO" } });
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
}

// Anula un contrato cargado por error — a diferencia de finalizarContrato
// (el alquiler pasó de verdad y terminó), esto es "nunca debió existir".
// Solo se permite si todavía no movió plata: sin comisión de alquiler
// cargada y sin liquidaciones Cargadas/Pagadas. Si ya movió plata, hay
// que finalizarlo en vez de anularlo — borrar liquidaciones ya cobradas
// rompería la caja. Las liquidaciones que quedaban pendientes se borran
// porque, al anular, nunca van a llegar a cobrarse.
export async function anularContrato(contractId: number, formData: FormData) {
  await requirePermission("administraciones.crear");

  const reason = optionalStr(formData.get("terminationReason"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUniqueOrThrow({
        where: { id: contractId },
        include: { rentalCommission: true, payments: { select: { status: true } } },
      });

      if (!contract.isAdministered && contract.status === "FIRMADO") {
        throw new Error("Esta colocación ya está firmada — no se puede anular. Para corregirla, usá \"Eliminar definitivamente\".");
      }

      if (contract.rentalCommission) {
        throw new Error("Este contrato ya tiene una comisión de alquiler cargada — no se puede anular, hay que finalizarlo.");
      }
      const yaMovioPlata = contract.payments.some(
        (p) => p.status === "PAGADO" || p.status === "PARCIAL" || p.status === "ENVIADA"
      );
      if (yaMovioPlata) {
        throw new Error("Este contrato ya tiene liquidaciones enviadas, cobradas o parciales — no se puede anular, hay que finalizarlo.");
      }

      await tx.payment.deleteMany({ where: { contractId } });

      await tx.contract.update({
        where: { id: contractId },
        data: { status: "ANULADO", terminatedAt: new Date(), terminationReason: reason },
      });
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
  revalidatePath("/backoffice/administraciones");
}

// Elimina un contrato POR COMPLETO, con todo lo que tenga cargado
// encima: liquidaciones, cobros, indexaciones, comisión de alquiler y
// sus cuotas/cobros, pagos ya hechos a agentes por esa comisión,
// documentos (fila + archivo real del bucket). A diferencia de
// anularContrato (que solo deshace un alta reciente sin plata movida
// todavía), esto sirve para corregir una carga errónea aunque YA se
// haya operado sobre el contrato — el costo es perder ese historial
// para siempre, por eso pide un permiso aparte de
// administraciones.crear, pensado para no dárselo a cualquiera.
//
// Orden de borrado dentro de la transacción: primero los CashMovement
// que referencian liquidaciones/comisión/cuotas (nada más los bloquea,
// pero ninguno de esos tiene onDelete Cascade), después lo que sí
// cascadea solo una vez despejado ese bloqueo. AgentDebtPayment no tiene
// FK real (sourceId es polimórfico) así que se limpia a mano aparte.
export async function eliminarContratoDefinitivo(contractId: number, formData: FormData) {
  const profile = await requirePermission("administraciones.eliminar");
  const reason = optionalStr(formData.get("reason"));
  // No hay tabla de auditoría en este sistema todavía — el registro
  // queda al menos en los logs del servidor, ya que de la fila misma no
  // va a quedar nada.
  console.log(`[eliminarContratoDefinitivo] contrato ${contractId} eliminado por ${profile.id}. Motivo: ${reason ?? "(sin motivo)"}`);

  const contract = await withRetry(() =>
    prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
      select: {
        unitId: true,
        renewals: { select: { id: true } },
        documents: { select: { storagePath: true } },
      },
    })
  );

  if (contract.renewals.length > 0) {
    throw new Error(
      "Este contrato tiene una renovación cargada que depende de él — hay que eliminar (o desvincular) esa renovación primero."
    );
  }

  await withRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const payments = await tx.payment.findMany({ where: { contractId }, select: { id: true } });
        const paymentIds = payments.map((p) => p.id);
        if (paymentIds.length > 0) {
          await tx.cashMovement.deleteMany({ where: { paymentId: { in: paymentIds } } });
        }

        const rentalCommission = await tx.rentalCommission.findUnique({
          where: { contractId },
          select: { id: true },
        });

        if (rentalCommission) {
          const installments = await tx.commissionInstallment.findMany({
            where: { rentalCommissionId: rentalCommission.id },
            select: { id: true },
          });
          const installmentIds = installments.map((i) => i.id);
          if (installmentIds.length > 0) {
            await tx.cashMovement.deleteMany({ where: { commissionInstallmentId: { in: installmentIds } } });
          }
          await tx.cashMovement.deleteMany({ where: { rentalCommissionId: rentalCommission.id } });

          // Lo ya pagado a agentes por esta comisión deja de tener a qué
          // referirse si la comisión desaparece — no es un FK real
          // (sourceId es polimórfico), Prisma no lo cascadea solo.
          await tx.agentDebtPayment.deleteMany({
            where: { sourceType: "RENTAL_COMMISSION", sourceId: rentalCommission.id },
          });

          // CommissionInstallment cascadea solo al borrar RentalCommission
          // (onDelete: Cascade), pero recién ahora que sus propios
          // CashMovement ya no existen.
          await tx.rentalCommission.delete({ where: { id: rentalCommission.id } });
        }

        // Payment cascadea PaymentItem/PaymentPartialPayment solos, pero
        // recién ahora que su CashMovement ya no existe.
        await tx.payment.deleteMany({ where: { contractId } });

        await tx.indexation.deleteMany({ where: { contractId } });

        // Guarantors/Concepts/Documents ya cascadean solos al borrar el
        // contrato (onDelete: Cascade) — los archivos reales de
        // Documents en el bucket se limpian aparte, después de que esta
        // transacción confirme.
        await tx.contract.delete({ where: { id: contractId } });
      },
      { timeout: 30000, maxWait: 15000 }
    )
  );

  if (contract.documents.length > 0) {
    await deleteContractDocuments(contract.documents.map((d) => d.storagePath)).catch((err) => {
      console.error(`No se pudieron borrar los archivos del contrato ${contractId} del bucket:`, err);
    });
  }

  revalidatePath("/backoffice/administraciones");
  revalidatePath("/backoffice/administraciones/liquidaciones");
  revalidatePath("/backoffice/administraciones/actualizaciones");
  revalidatePath("/backoffice/caja");
  revalidatePath(`/backoffice/historial/${contract.unitId}`);
  redirect("/backoffice/administraciones");
}

// Corrige/completa el vendedor y captador de un contrato ya cargado —
// necesario para contratos viejos, dados de alta antes de que estos
// campos existieran, o para arreglar un error de carga.
export async function actualizarAgentesContrato(contractId: number, formData: FormData) {
  await requirePermission("administraciones.crear");

  const vendedorAgentId = optionalStr(formData.get("vendedorAgentId"));
  const captadorAgentId = optionalStr(formData.get("captadorAgentId"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      await assertColocacionEditable(tx, contractId);
      await tx.contract.update({
        where: { id: contractId },
        data: { vendedorAgentId, captadorAgentId },
      });
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
}

// Editable en cualquier momento del contrato, no solo cerca del
// vencimiento — "a confirmar" (sin marcar) vuelve a null a propósito,
// para poder deshacer una marca puesta de más. Solo "Sí" entra a la
// proyección financiera (ver getProjection).
export async function actualizarRenovacionEsperada(contractId: number, formData: FormData) {
  await requirePermission("administraciones.crear");

  const raw = optionalStr(formData.get("renewalCommissionExpected"));
  const renewalCommissionExpected = raw === "true" ? true : raw === "false" ? false : null;

  await withRetry(() =>
    prisma.contract.update({ where: { id: contractId }, data: { renewalCommissionExpected } })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
  revalidatePath("/backoffice/administraciones/actualizaciones");
}

// Grupos de contratos (carteras): quién ve/gestiona qué. Se crean vacíos
// y se les asignan contratos ya existentes después (asignarContratosAGrupo)
// — no hace falta elegir el grupo al cargar el contrato.
// Asignación masiva desde el listado de contratos (tildás varios,
// elegís el grupo) — `groupId` vacío desasigna (vuelve a "sin grupo").
export async function asignarContratosAGrupo(formData: FormData) {
  await requirePermission("administraciones.grupos.gestionar");

  const groupId = optionalInt(formData.get("groupId"));
  const contractIds = formData
    .getAll("contractIds")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  if (contractIds.length === 0) throw new Error("Seleccioná al menos un contrato.");

  await withRetry(() =>
    prisma.contract.updateMany({ where: { id: { in: contractIds } }, data: { groupId } })
  );

  revalidatePath("/backoffice/administraciones");
  revalidatePath("/backoffice/usuarios/grupos");
}

// Reasignar el grupo de un contrato puntual desde su propia ficha —
// alternativa a la asignación masiva del listado.
export async function asignarGrupoContrato(contractId: number, formData: FormData) {
  await requirePermission("administraciones.grupos.gestionar");

  const groupId = optionalInt(formData.get("groupId"));

  await withRetry(() => prisma.contract.update({ where: { id: contractId }, data: { groupId } }));

  revalidatePath(`/backoffice/administraciones/${contractId}`);
  revalidatePath("/backoffice/administraciones");
}

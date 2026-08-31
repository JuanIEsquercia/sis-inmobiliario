"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { addMonths, buildPaymentSchedule, computeEndDate, paymentTotal } from "@/lib/alquileres";
import { resolveClient, resolveUnit } from "@/lib/backoffice-resolvers";
import { uploadContractDocument } from "@/lib/supabase/storage";
import { crearRentalCommissionEnTx } from "@/lib/comisiones";
import {
  optionalDecimal,
  optionalInt,
  optionalStr,
  requiredDate,
  requiredDecimal,
  requiredStr,
} from "@/lib/form-utils";
import type { DocumentType } from "@/generated/prisma/client";

function guarantorIndices(formData: FormData): number[] {
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^guarantors\.(\d+)\./);
    if (match) indices.add(Number(match[1]));
  }
  return [...indices].sort((a, b) => a - b);
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
      const ownerId = await resolveClient(tx, formData, "owner", "Propietario");
      const tenantId = await resolveClient(tx, formData, "tenant", "Inquilino");
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
          isAdministered,
          managementFeePercent,
          indexationFrequencyMonths,
          indexTypeId,
          nextIndexationDueAt: indexationFrequencyMonths ? addMonths(startDate, indexationFrequencyMonths) : null,
          notes: optionalStr(formData.get("notes")),
          paymentAlias,
          paymentCBU,
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
        const schedule = buildPaymentSchedule(startDate, durationMonths);

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
  const amount = optionalDecimal(formData.get("amount"));

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

// Corrige/completa el vendedor y captador de un contrato ya cargado —
// necesario para contratos viejos, dados de alta antes de que estos
// campos existieran, o para arreglar un error de carga.
export async function actualizarAgentesContrato(contractId: number, formData: FormData) {
  await requirePermission("administraciones.crear");

  const vendedorAgentId = optionalStr(formData.get("vendedorAgentId"));
  const captadorAgentId = optionalStr(formData.get("captadorAgentId"));

  await withRetry(() =>
    prisma.contract.update({
      where: { id: contractId },
      data: { vendedorAgentId, captadorAgentId },
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

import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { contractGroupWhere, type ContractGroupScope } from "@/lib/auth";

// Propietario/inquilino son opcionales al cargar un contrato (ver
// comentario en el modelo) — mismo criterio que agentLabel (lib/caja.ts)
// para mostrar algo legible mientras se completan los datos reales.
export function clientLabel(client: { firstName: string; lastName: string } | null | undefined) {
  return client ? `${client.firstName} ${client.lastName}` : "A completar";
}

// Solo contratos administrados: una colocación pura (isAdministered
// false, sin liquidaciones ni indexación propia) no tiene nada que
// gestionar acá, vive únicamente en Caja > Comisión alquileres. Sigue
// existiendo como Contract (para el historial de la unidad) y su ficha
// sigue siendo accesible, solo no aparece en este listado.
export async function getContracts(scope: ContractGroupScope, query?: string) {
  const q = query?.trim();
  return withRetry(() =>
    prisma.contract.findMany({
      where: {
        isAdministered: true,
        ...(contractGroupWhere(scope) ?? {}),
        ...(q
          ? {
              OR: [
                { unit: { propertyCode: { contains: q, mode: "insensitive" } } },
                { unit: { address: { contains: q, mode: "insensitive" } } },
                { tenant: { firstName: { contains: q, mode: "insensitive" } } },
                { tenant: { lastName: { contains: q, mode: "insensitive" } } },
                { owner: { firstName: { contains: q, mode: "insensitive" } } },
                { owner: { lastName: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { unit: true, owner: true, tenant: true, group: true },
      orderBy: { createdAt: "desc" },
    })
  );
}

export interface PaymentPeriod {
  periodMonth: number;
  periodYear: number;
  dueDate: Date;
}

// Suma (o resta, con meses negativos) meses de calendario, recortando al
// último día del mes destino cuando el día de origen no existe ahí.
//
// Antes esto era un setUTCMonth pelado, y ahí estaba el problema: si el
// día no existe en el mes destino, JavaScript NO avisa, desborda al mes
// siguiente. El 31 de enero más un mes daba 3 de marzo (enero tiene 31
// días, febrero 28: sobran 3 y se los lleva a marzo). El 30 de enero
// daba 2 de marzo, y el 29 daba 1 de marzo. En un año bisiesto el 31 de
// enero daba 2 de marzo en vez del 29 de febrero.
//
// Afectaba a la fecha de fin de contrato y a la de próxima
// actualización: un contrato que empieza el 31/08 a 6 meses terminaba el
// 3 de marzo en vez del 28 de febrero, corriendo el vencimiento a otro
// mes.
//
// Los vencimientos mensuales de las liquidaciones NO tenían este
// problema: buildPaymentSchedule ya recortaba con Math.min(dueDay,
// díasDelMes). Esta función ahora hace lo mismo, así las dos partes del
// sistema tratan el fin de mes igual.
//
// Es el mismo criterio que usan las librerías de fechas conocidas
// (date-fns, Luxon): "un mes después del 31 de enero" es el 28 (o 29) de
// febrero, no el 3 de marzo.
//
// Consecuencia a tener presente: con recorte, ir y volver no siempre
// devuelve la fecha original (31/03 menos un mes da 28/02, y sumarle uno
// da 28/03). Es inherente a contar meses de calendario, no un defecto de
// esta implementación.
const ZONA = "America/Argentina/Buenos_Aires";

// El día de calendario argentino de un instante, como "2026-10-05".
//
// Hace falta convertir el huso: el servidor corre en UTC, y Argentina
// está 3 horas atrás. Un cobro registrado el 5 a las 22:00 de Argentina
// es el 6 a las 01:00 en UTC, así que mirarlo en UTC lo correría un día
// y lo haría figurar como pagado tarde.
//
// "en-CA" se usa porque formatea como AAAA-MM-DD, que además se puede
// comparar como texto y ordena igual que la fecha.
function diaArgentino(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

// El día que representa una fecha de vencimiento.
//
// Estas NO se convierten de huso, a propósito: no son un instante sino
// un día del calendario, y se guardan a medianoche UTC justamente para
// representarlo (ver buildPaymentSchedule, que las arma con Date.UTC).
// Pasarlas a hora argentina las correría al día anterior a las 21:00.
function diaDeVencimiento(vencimiento: Date): string {
  return vencimiento.toISOString().slice(0, 10);
}

// Medianoche UTC del día de HOY en Argentina, para comparar contra las
// fechas de vencimiento en consultas a la base.
//
// No alcanza con la medianoche UTC de hoy: entre las 21:00 y las 24:00
// de Argentina, en UTC ya es el día siguiente, así que una liquidación
// que vence mañana figuraba como vencida durante esas tres horas.
export function inicioDeHoyArgentina(): Date {
  const [a, m, d] = diaArgentino(new Date()).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

export function addMonths(date: Date, months: number): Date {
  const año = date.getUTCFullYear();
  const mes = date.getUTCMonth();
  const dia = date.getUTCDate();

  // Día 1 del mes destino, para que normalizar el desborde de meses
  // (negativos o más de 12) no arrastre también el día.
  const destino = new Date(Date.UTC(año, mes + months, 1));
  const añoDestino = destino.getUTCFullYear();
  const mesDestino = destino.getUTCMonth();

  // Día 0 del mes siguiente = último día del mes destino.
  const diasDelMesDestino = new Date(Date.UTC(añoDestino, mesDestino + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(
      añoDestino,
      mesDestino,
      Math.min(dia, diasDelMesDestino),
      // La hora se conserva tal cual venía: estas fechas se guardan a
      // medianoche UTC, pero no es tarea de esta función decidirlo.
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

export function computeEndDate(startDate: Date, durationMonths: number): Date {
  return addMonths(startDate, durationMonths);
}

// Un período por cada mes de la duración del contrato (un contrato de
// 12 meses genera exactamente 12 liquidaciones, no 13 — el mes de
// endDate ya es el día de entrega, no un mes más de ocupación), con
// vencimiento en `dueDay` de cada mes — el día que pactó ESE contrato
// (Contract.paymentDueDay), no necesariamente el día en que arrancó.
export function buildPaymentSchedule(startDate: Date, durationMonths: number, dueDay: number): PaymentPeriod[] {
  const entries: PaymentPeriod[] = [];
  const startMonth = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

  for (let i = 0; i < durationMonths; i++) {
    const cursor = new Date(startMonth);
    cursor.setUTCMonth(cursor.getUTCMonth() + i);

    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    entries.push({
      periodMonth: month + 1,
      periodYear: year,
      dueDate: new Date(Date.UTC(year, month, Math.min(dueDay, daysInMonth))),
    });
  }

  return entries;
}

// findFirst (no findUnique) porque necesita combinar el id con el
// filtro por scope — un contrato fuera de tu(s) grupo(s) da `null`,
// igual que si no existiera, para no filtrar si existe o no.
export async function getContractById(id: number, scope: ContractGroupScope) {
  const groupWhere = contractGroupWhere(scope);
  return withRetry(() =>
    prisma.contract.findFirst({
      // Una colocación sin administración (ver getContracts) no pertenece
      // a ninguna cartera — el scope por grupo solo tiene sentido para lo
      // que sí se administra, así que acá se ignora para cualquier
      // contrato con isAdministered false, sea cual sea su groupId (que
      // de hecho siempre nace null). Sin este bypass, un agente sin
      // administraciones.ver_todos jamás podría entrar a la ficha de una
      // colocación recién cargada — quedaba sin grupo y sin grupo es
      // invisible para su scope.
      where: { id, ...(groupWhere ? { OR: [{ isAdministered: false }, groupWhere] } : {}) },
      include: {
        unit: true,
        owner: true,
        tenant: true,
        group: true,
        guarantors: { include: { client: true } },
        vendedorAgent: true,
        captadorAgent: true,
        rentalCommission: { include: { vendedorAgent: true, captadorAgent: true } },
        indexType: true,
        concepts: { include: { concept: true } },
        documents: { include: { uploadedBy: { select: { username: true } } }, orderBy: { createdAt: "desc" } },
        payments: {
          orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
          include: { items: { include: { concept: true } } },
        },
        indexations: { orderBy: { appliedAt: "desc" }, include: { indexType: true } },
      },
    })
  );
}

// Con scope, igual que getContractById — una liquidación de un contrato
// fuera de tu cartera da `null`, como si no existiera. Sin esto, la
// página se abría con cualquier id tipeado en la URL.
export async function getPaymentById(id: number, scope: ContractGroupScope) {
  const groupWhere = contractGroupWhere(scope);
  return withRetry(() =>
    prisma.payment.findFirst({
      where: { id, ...(groupWhere ? { contract: { OR: [{ isAdministered: false }, groupWhere] } } : {}) },
      include: {
        contract: { include: { unit: true, tenant: true, owner: true } },
        items: { include: { concept: true }, orderBy: { id: "asc" } },
        partialPayments: { orderBy: { paidAt: "asc" } },
      },
    })
  );
}

// Para el comprobante imprimible de una actualización puntual — mismo
// criterio que getPaymentById.
export async function getIndexationById(id: number, scope: ContractGroupScope) {
  const groupWhere = contractGroupWhere(scope);
  return withRetry(() =>
    prisma.indexation.findFirst({
      where: { id, ...(groupWhere ? { contract: { OR: [{ isAdministered: false }, groupWhere] } } : {}) },
      include: {
        contract: { include: { unit: true, tenant: true, owner: true } },
        indexType: true,
      },
    })
  );
}

export function paymentTotal(items: { amount: unknown }[]): number {
  return items.reduce((sum, item) => sum + (item.amount ? Number(item.amount) : 0), 0);
}

export interface PaymentBreakdown {
  total: number;
  managementFee: number;
  netForOwner: number;
}

// La comisión de administración se calcula solo sobre el ítem de
// Alquiler (concept.isSystem), nunca sobre expensas/agua/etc.
export function paymentBreakdown(
  items: { amount: unknown; concept: { isSystem: boolean } }[],
  feePercent: unknown
): PaymentBreakdown {
  const total = paymentTotal(items);
  const rentItem = items.find((i) => i.concept.isSystem);
  const rentAmount = rentItem?.amount ? Number(rentItem.amount) : 0;
  const managementFee = rentAmount * (Number(feePercent) / 100);
  return { total, managementFee, netForOwner: total - managementFee };
}

export interface OwnerSettlement {
  recibidoPorInmobiliaria: number;
  recibidoPorPropietario: number;
  /** Cobros viejos, cargados antes de que existiera `receivedBy`. */
  sinRegistrar: number;
  /** Cuánto hay que girarle al propietario. */
  aGirar: number;
  /** Si no entró nada a la inmobiliaria, no hay giro que hacer. */
  requiereGiro: boolean;
}

// Qué queda pendiente del lado del propietario, según a quién le entró
// realmente la plata (ver PaymentRecipient).
//
// Antes esto no se podía saber y el sistema asumía siempre que la plata
// pasaba por la inmobiliaria: en el caso habitual (el inquilino le
// transfiere directo al propietario) te exigía registrar un giro que
// nunca existió. Las consecuencias son espejadas: si cobró el
// propietario, no hay nada que girarle y lo que queda pendiente es
// cobrar nuestra comisión; si cobró la inmobiliaria, la comisión ya está
// en mano y lo que queda es girarle el neto.
//
// Lo que se gira es lo que entró ACÁ menos la comisión, no el neto
// completo de la liquidación: en un mes mixto (parte en efectivo acá,
// parte directo al propietario) girar el neto entero sería girar plata
// que nunca pasó por nosotros. Nunca negativo — si lo que entró no
// alcanza a cubrir la comisión, no hay nada que girar y lo que falta es
// terminar de cobrarla.
export function ownerSettlement(
  partials: { amount: unknown; receivedBy: string | null }[],
  managementFee: number,
  netForOwner: number
): OwnerSettlement {
  let recibidoPorInmobiliaria = 0;
  let recibidoPorPropietario = 0;
  let sinRegistrar = 0;

  for (const p of partials) {
    const amount = Number(p.amount ?? 0);
    if (p.receivedBy === "INMOBILIARIA") recibidoPorInmobiliaria += amount;
    else if (p.receivedBy === "PROPIETARIO") recibidoPorPropietario += amount;
    else sinRegistrar += amount;
  }

  // Con algún cobro sin registrar no se puede afirmar que no haya nada
  // que girar, así que se cae al comportamiento viejo (ofrecer el giro
  // por el neto completo) en vez de esconder un paso que podría faltar.
  if (sinRegistrar > 0) {
    return { recibidoPorInmobiliaria, recibidoPorPropietario, sinRegistrar, aGirar: netForOwner, requiereGiro: true };
  }

  return {
    recibidoPorInmobiliaria,
    recibidoPorPropietario,
    sinRegistrar,
    aGirar: Math.max(0, recibidoPorInmobiliaria - managementFee),
    requiereGiro: recibidoPorInmobiliaria > 0,
  };
}

// Contratos activos cuya próxima indexación vence dentro de los
// próximos `withinDays` días (por defecto 30) O YA VENCIÓ y todavía no
// se aplicó — es una lista de tareas, no un calendario: una actualización
// vencida no se aplicó sola, así que nunca se filtra por "ya pasó", se
// muestra atrasada hasta que alguien la aplique (ver aplicarIndexacion,
// que es quien recién mueve `nextIndexationDueAt` para adelante).
export async function getContractsDueForIndexation(scope: ContractGroupScope, withinDays = 30) {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const limit = new Date(startOfToday);
  limit.setUTCDate(limit.getUTCDate() + withinDays);

  return withRetry(() =>
    prisma.contract.findMany({
      where: {
        status: "ACTIVO",
        nextIndexationDueAt: { lte: limit },
        ...(contractGroupWhere(scope) ?? {}),
      },
      include: { unit: true, tenant: true, owner: true, indexType: true },
      orderBy: { nextIndexationDueAt: "asc" },
    })
  );
}

// Contratos activos cuya fecha de fin cae dentro de los próximos
// `withinDays` días (por defecto 60) — la lista de "por vencer", que es
// DISTINTA de getContractsDueForIndexation: un contrato puede tener su
// próxima actualización de alquiler pronto y aun así faltarle varios
// cortes antes del vencimiento real. Es donde conviene decidir/revisar
// si la eventual renovación va a cobrar comisión (ver
// actualizarRenovacionEsperada).
export async function getContractsNearingEnd(scope: ContractGroupScope, withinDays = 60) {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const limit = new Date(startOfToday);
  limit.setUTCDate(limit.getUTCDate() + withinDays);

  return withRetry(() =>
    prisma.contract.findMany({
      where: {
        status: "ACTIVO",
        endDate: { gte: startOfToday, lte: limit },
        ...(contractGroupWhere(scope) ?? {}),
      },
      include: { unit: true, tenant: true, owner: true },
      orderBy: { endDate: "asc" },
    })
  );
}

// Todas las liquidaciones de un período (mes/año), cruzando todos los
// contratos — para la vista mensual de Liquidaciones.
export async function getPaymentsForPeriod(scope: ContractGroupScope, periodMonth: number, periodYear: number) {
  return withRetry(() =>
    prisma.payment.findMany({
      where: { periodMonth, periodYear, contract: contractGroupWhere(scope) ?? undefined },
      include: {
        items: { include: { concept: true } },
        contract: { include: { unit: true, owner: true, tenant: true } },
        // Hacen falta para saber qué queda pendiente de cada liquidación:
        // los cobros dicen a quién le entró la plata (ver ownerSettlement)
        // y el cashMovement dice si ya cobramos nuestra comisión.
        partialPayments: { select: { amount: true, receivedBy: true } },
        cashMovement: { select: { id: true } },
      },
      orderBy: { contractId: "asc" },
    })
  );
}

// Liquidaciones ya cobradas por el inquilino (status PAGADO) donde la
// inmobiliaria todavía no confirmó tener en mano su propia comisión de
// administración (sin CashMovement todavía) — para Caja > Administración.
// Sin filtro por grupo: Caja no está scopeada por cartera, la ve
// cualquiera con permiso de Caja.
//
// Quedan afuera las que no generan comisión, que son dos casos reales:
// contratos con el % de administración en 0 (familiares, acuerdos
// particulares) y meses sin base para calcular, como un mes de gracia.
// En los dos la comisión da 0: no hay nada en mano que confirmar, así
// que la liquidación ya está cerrada y listarla como pendiente es
// pedir un paso que no existe.
//
// Esto arregla algo que dejaba liquidaciones trabadas para siempre:
// aparecían acá con "Comisión $0" y un botón Confirmar que no hacía
// nada, porque la acción cortaba sin crear el CashMovement y entonces
// la liquidación seguía contando como pendiente. El filtro va en JS y
// no en el where porque la comisión no es una columna: se calcula a
// partir de los ítems y del % del contrato (ver paymentBreakdown).
export async function getPaymentsPendingFeeConfirmation() {
  const pagos = await withRetry(() =>
    prisma.payment.findMany({
      where: { status: "PAGADO", cashMovement: null },
      include: {
        items: { include: { concept: true } },
        contract: { include: { unit: true, owner: true } },
      },
      orderBy: { paidAt: "desc" },
    })
  );

  return pagos.filter((p) => paymentBreakdown(p.items, p.contract.managementFeePercent).managementFee > 0);
}

export interface MoraChargeSummary {
  contractId: number;
  propertyCode: string;
  address: string;
  tenantName: string;
  currency: string;
  total: number;
  periods: number;
}

// Cuánto se cargó en concepto de "Mora" (interés por atraso) por
// contrato, sumando el ítem de esa liquidación cada mes que se cargó —
// "Mora" no es un campo propio, es un Concept más (ver
// agregarConceptoLiquidacion), así que se identifica por nombre.
export async function getMoraChargesSummary(scope: ContractGroupScope) {
  const items = await withRetry(() =>
    prisma.paymentItem.findMany({
      where: {
        concept: { name: { equals: "Mora", mode: "insensitive" } },
        amount: { not: null },
        payment: { contract: contractGroupWhere(scope) ?? undefined },
      },
      include: {
        payment: { include: { contract: { include: { unit: true, tenant: true } } } },
      },
    })
  );

  const byContract = new Map<number, MoraChargeSummary>();
  for (const item of items) {
    const contract = item.payment.contract;
    const amount = Number(item.amount ?? 0);
    const existing = byContract.get(contract.id);
    if (existing) {
      existing.total += amount;
      existing.periods += 1;
    } else {
      byContract.set(contract.id, {
        contractId: contract.id,
        propertyCode: contract.unit.propertyCode,
        address: contract.unit.address,
        tenantName: clientLabel(contract.tenant),
        currency: item.payment.currency,
        total: amount,
        periods: 1,
      });
    }
  }

  const rows = [...byContract.values()].sort((a, b) => b.total - a.total);
  const totalsByCurrency = new Map<string, number>();
  for (const row of rows) {
    totalsByCurrency.set(row.currency, (totalsByCurrency.get(row.currency) ?? 0) + row.total);
  }

  return { rows, totalsByCurrency };
}

export interface OverduePayment {
  paymentId: number;
  contractId: number;
  propertyCode: string;
  address: string;
  tenantName: string;
  currency: string;
  periodMonth: number;
  periodYear: number;
  dueDate: Date;
  saldo: number;
  daysLate: number;
}

export type MoraBucket = "1-3" | "4-8" | "9-15" | "16-30" | "30+";

export function moraBucketFor(daysLate: number): MoraBucket {
  if (daysLate <= 3) return "1-3";
  if (daysLate <= 8) return "4-8";
  if (daysLate <= 15) return "9-15";
  if (daysLate <= 30) return "16-30";
  return "30+";
}

// Liquidaciones vencidas y todavía no cobradas del todo (ni Enviada,
// Parcial o incluso recién Pendiente si ya pasó la fecha) — la lista
// base para el seguimiento de morosidad: días de atraso a hoy,
// categorización por rango y promedio se calculan a partir de esto.
export async function getOverduePayments(scope: ContractGroupScope): Promise<OverduePayment[]> {
  // El inicio del día ARGENTINO, no el de UTC. Con UTC, entre las 21:00
  // y las 24:00 de acá el servidor ya está en el día siguiente, así que
  // una liquidación que vencía al otro día aparecía como vencida durante
  // esas tres horas todas las noches.
  const startOfToday = inicioDeHoyArgentina();

  const payments = await withRetry(() =>
    prisma.payment.findMany({
      where: {
        status: { in: ["PENDIENTE", "ENVIADA", "PARCIAL"] },
        dueDate: { lt: startOfToday },
        contract: contractGroupWhere(scope) ?? undefined,
      },
      include: {
        items: true,
        contract: { include: { unit: true, tenant: true } },
      },
      orderBy: { dueDate: "asc" },
    })
  );

  return payments.map((p) => {
    const total = paymentTotal(p.items);
    const saldo = total - Number(p.paidAmount ?? 0);
    const daysLate = Math.round((startOfToday.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      paymentId: p.id,
      contractId: p.contractId,
      propertyCode: p.contract.unit.propertyCode,
      address: p.contract.unit.address,
      tenantName: clientLabel(p.contract.tenant),
      currency: p.currency,
      periodMonth: p.periodMonth,
      periodYear: p.periodYear,
      dueDate: p.dueDate,
      saldo,
      daysLate,
    };
  });
}

export async function getConcepts() {
  return withRetry(() => prisma.concept.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] }));
}

export async function getIndexTypes() {
  return withRetry(() => prisma.indexType.findMany({ orderBy: { code: "asc" } }));
}

export interface ContractPunctuality {
  totalPayments: number;
  paidOnTime: number;
  paidLate: number;
  overdue: number;
  pending: number;
}

// "Atrasado" no es un status guardado (nada lo asigna nunca — ver
// getOverduePayments, que ya calcula el atraso al vuelo desde dueDate en
// vez de depender de un status): acá se calcula igual, comparando contra
// hoy, para que el resumen de puntualidad del cliente no muestre "0
// atrasados" aunque tenga pagos vencidos sin cobrar.
//
// Todo se compara por DÍA DE CALENDARIO, no por instante. Antes se
// comparaban las fechas crudas y eso daba un resultado falso: dueDate se
// guarda a medianoche (buildPaymentSchedule arma la fecha con Date.UTC,
// sin hora), mientras que paidAt es el momento exacto en que se registró
// el cobro. Entonces `paidAt <= dueDate` solo era verdadero si se pagaba
// ANTES de la medianoche del día de vencimiento: pagar el mismo día que
// vencía contaba como tarde.
//
// Caso real: el contrato de 25 de Mayo 1720 vencía el 05/10 y se cobró
// el 05/10 a las 09:21 de la mañana. Figuraba como "pagada tarde".
function summarizePunctuality(
  payments: { status: string; dueDate: Date; paidAt: Date | null }[]
): ContractPunctuality {
  const hoy = diaArgentino(new Date());
  let paidOnTime = 0;
  let paidLate = 0;
  let overdue = 0;
  let pending = 0;

  for (const p of payments) {
    if (p.status === "PAGADO") {
      // Sin paidAt no se puede saber cuándo se pagó (cobros viejos,
      // cargados antes de que se registrara la fecha). Se cuentan como
      // tarde para no inflar la puntualidad con algo que no consta.
      if (p.paidAt && diaArgentino(p.paidAt) <= diaDeVencimiento(p.dueDate)) paidOnTime++;
      else paidLate++;
    } else if (diaDeVencimiento(p.dueDate) < hoy) {
      // Estrictamente menor: la que vence HOY todavía no está atrasada.
      overdue++;
    } else {
      pending++;
    }
  }

  return { totalPayments: payments.length, paidOnTime, paidLate, overdue, pending };
}

export async function listClients(query?: string) {
  const q = query?.trim();
  return withRetry(() =>
    prisma.client.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { docId: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 50,
    })
  );
}

// Ficha de cliente: tres bloques separados y sin cruzarse. La
// puntualidad de "como inquilino" se calcula solo con los pagos de esos
// contratos — nunca se guarda en Client ni se mezcla con su rol de
// propietario/garante en otro contrato.
export async function getClientById(id: number) {
  const client = await withRetry(() =>
    prisma.client.findUnique({
      where: { id },
      include: {
        contractsAsTenant: {
          include: {
            unit: true,
            owner: true,
            payments: { select: { status: true, dueDate: true, paidAt: true } },
          },
          orderBy: { startDate: "desc" },
        },
        contractsAsOwner: {
          include: { unit: true, tenant: true },
          orderBy: { startDate: "desc" },
        },
        guarantorFor: {
          include: { contract: { include: { unit: true, tenant: true, owner: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  );
  if (!client) return null;

  return {
    ...client,
    contractsAsTenant: client.contractsAsTenant.map((c) => ({
      ...c,
      punctuality: summarizePunctuality(c.payments),
    })),
  };
}

// Catálogo de propiedades para el módulo de Historial — todas las
// unidades cargadas, tengan o no contrato activo hoy.
export async function getUnits(query?: string) {
  const q = query?.trim();
  return withRetry(() =>
    prisma.unit.findMany({
      where: q
        ? {
            OR: [
              { propertyCode: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { _count: { select: { contracts: true, sales: true, appraisals: true } } },
      orderBy: { propertyCode: "asc" },
    })
  );
}

// Ficha de unidad: trazabilidad completa de esa propiedad (mismo código
// Adinco) — contratos, ventas y tasaciones, sin importar cuántas veces
// se haya reutilizado la unidad a lo largo de los años.
export async function getUnitById(id: number) {
  return withRetry(() =>
    prisma.unit.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { owner: true, tenant: true },
          orderBy: { startDate: "desc" },
        },
        sales: {
          include: { seller: true, buyer: true },
          orderBy: { closedAt: "desc" },
        },
        appraisals: {
          orderBy: { completedAt: "desc" },
        },
      },
    })
  );
}

export async function getContractGroups() {
  return withRetry(() =>
    prisma.contractGroup.findMany({
      include: { members: { include: { profile: true } }, _count: { select: { contracts: true } } },
      orderBy: { name: "asc" },
    })
  );
}

export async function getContractGroupById(id: number) {
  return withRetry(() =>
    prisma.contractGroup.findUnique({
      where: { id },
      include: {
        members: { include: { profile: true } },
        contracts: { include: { unit: true, tenant: true, owner: true }, orderBy: { createdAt: "desc" } },
      },
    })
  );
}

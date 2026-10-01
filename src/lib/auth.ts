import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { ALL_PERMISSION_KEYS, expandPermissions } from "@/lib/permissions";
import type { Profile } from "@/generated/prisma/client";

// proxy.ts ya redirige a /backoffice/login si no hay sesión; estos
// helpers asumen que corren dentro de /backoffice y solo resuelven el
// Profile (rol) para las rutas/acciones que lo necesitan.

// El layout de /backoffice ya llama a requireProfile, y casi toda página
// hija vuelve a llamar a requirePermission — sin memoizar, cada una
// repetía la llamada a Supabase Auth + la consulta a Profile en el mismo
// render. cache() de React deduplica por request: sigue siendo una sola
// llamada real aunque se invoque varias veces layout adentro.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await withRetry(() => prisma.profile.findUnique({ where: { id: user.id } }));
  if (!profile) return null;

  // ADMIN siempre tiene el catálogo completo de permisos, calculado acá
  // (no se persiste) — así un ADMIN nunca queda con permisos viejos
  // cuando el catálogo en permissions.ts crece; el array guardado en la
  // fila solo importa para AGENTE, donde sí es granular por usuario —
  // y ahí se le suman las dependencias implícitas (ver
  // PERMISSION_IMPLIES), también en memoria, nunca en la fila.
  return profile.role === "ADMIN"
    ? { ...profile, permissions: ALL_PERMISSION_KEYS }
    : { ...profile, permissions: expandPermissions(profile.permissions) };
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  // Sesión de Supabase válida pero sin Profile (o desactivado): hay que
  // CERRAR esa sesión, no solo mandar al login — el proxy ve la cookie
  // viva y vuelve a meterlo adentro, y así queda en un loop. Un Server
  // Component no puede escribir cookies, por eso pasa por la ruta
  // /backoffice/logout, que sí puede.
  if (!profile || !profile.isActive) redirect("/backoffice/logout?motivo=inactivo");
  return profile;
}

export async function requirePermission(key: string): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.permissions.includes(key)) redirect("/backoffice");
  return profile;
}

// Exige el ROL ADMIN, no un permiso.
//
// La diferencia importa: un ADMIN recibe el catálogo completo de
// permisos (ver getCurrentProfile), así que crear una clave nueva no
// serviría para reservarle algo — a un AGENTE se le podría otorgar esa
// misma clave y quedaría igualado. Para lo que tiene que ser
// exclusivamente de la dueña o el dueño del sistema, hay que mirar el
// rol.
//
// Se reserva para correcciones sobre datos ya cargados, que arreglan un
// error de carga y no son parte de la operación de todos los días.
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN") redirect("/backoffice");
  return profile;
}

export async function requireAnyPermission(keys: string[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!keys.some((k) => profile.permissions.includes(k))) redirect("/backoffice");
  return profile;
}

// "all" = sin restricción (administraciones.ver_todos, o ADMIN que ya
// lo trae incluido). Si no, la lista de ContractGroup a los que
// pertenece — puede ser [] (sin ningún grupo asignado todavía, no ve
// ningún contrato). Un contrato sin grupo asignado (groupId null) solo
// lo ve "all" — nunca queda "suelto y visible para cualquiera" por
// default, ver comentario en Contract.groupId.
export type ContractGroupScope = "all" | number[];

// Memoizada por request igual que getCurrentProfile, y por el mismo
// motivo: el layout del backoffice la llama, y después casi toda página
// hija la vuelve a llamar para armar su propio scope. Sin cache() eso
// era una consulta repetida (idéntica) por cada llamada, y con la base
// en Oregon cada viaje se paga caro. La clave del cache es el argumento
// `profile`, y como ese objeto ya viene memoizado de
// getCurrentProfile/requireProfile, dentro de un mismo request es
// siempre la MISMA referencia — así que el cache pega.
export const getContractGroupScope = cache(async (profile: Profile): Promise<ContractGroupScope> => {
  if (profile.permissions.includes("administraciones.ver_todos")) return "all";
  const memberships = await withRetry(() =>
    prisma.profileContractGroup.findMany({ where: { profileId: profile.id }, select: { groupId: true } })
  );
  return memberships.map((m) => m.groupId);
});

// Where-clause de Prisma para filtrar Contract (o una relación hacia
// Contract) según el scope — combinar con spread en el `where` de cada
// query. `null` cuando el scope es "all" (sin filtro).
export function contractGroupWhere(scope: ContractGroupScope): { groupId: { in: number[] } } | null {
  return scope === "all" ? null : { groupId: { in: scope } };
}

// Chequeo de cartera para OPERAR sobre un contrato (cobrar, liquidar,
// actualizar, anular...), no solo para listarlo — mismo criterio que
// getContractById: "all" pasa siempre; una colocación (isAdministered
// false) no pertenece a ninguna cartera y pasa siempre; un administrado
// pasa solo si su groupId está entre los grupos del usuario (sin grupo
// no pasa para nadie que no sea "all", igual que en el listado). Tira
// en vez de devolver false para usarse como una línea más al principio
// de cada acción, justo después de requirePermission — sin esto, el
// scope se saltaba armando la URL o el form con el id de otro contrato.
export async function assertContractInScope(contractId: number, profile: Profile): Promise<void> {
  const scope = await getContractGroupScope(profile);
  if (scope === "all") return;

  const contract = await withRetry(() =>
    prisma.contract.findUnique({ where: { id: contractId }, select: { isAdministered: true, groupId: true } })
  );
  if (!contract) throw new Error("El contrato no existe.");
  if (!contract.isAdministered) return;
  if (contract.groupId === null || !scope.includes(contract.groupId)) {
    throw new Error("No tenés acceso a este contrato — no pertenece a tu cartera.");
  }
}

// Idem para una liquidación puntual: resuelve a qué contrato pertenece
// y delega. Devuelve el contractId para que la acción no tenga que
// volver a buscarlo.
export async function assertPaymentInScope(paymentId: number, profile: Profile): Promise<number> {
  const payment = await withRetry(() =>
    prisma.payment.findUnique({ where: { id: paymentId }, select: { contractId: true } })
  );
  if (!payment) throw new Error("La liquidación no existe.");
  await assertContractInScope(payment.contractId, profile);
  return payment.contractId;
}

// ---------------------------------------------------------------------
// Alcance de Caja, por AGENTE (no por cartera como Administraciones).
//
// Caja no tiene noción de grupo: una venta o una comisión pertenece a
// las personas que la hicieron. Hasta ahora no tenía ningún alcance —
// `caja.ver` mostraba todas las ventas, comisiones y movimientos de la
// inmobiliaria a cualquier agente. Ahora, salvo que tengas
// caja.ver_todos, solo ves lo tuyo.
//
// "Tuyo" = figurás como creador, vendedor o captador. Los tres, porque
// quien carga la operación no siempre es quien la hizo (en esta agencia
// las carga el dueño casi siempre) y quien la hizo tiene que verla; y a
// la vez quien la tipeó no debería perder de vista lo que cargó.
//
// Devuelve el id del agente al que hay que restringir, o `null` cuando
// no hay restricción — mismo contrato que contractGroupWhere, que
// devuelve null para "all".
// ---------------------------------------------------------------------
export function cajaOwnerId(profile: Profile): string | null {
  return profile.permissions.includes("caja.ver_todos") ? null : profile.id;
}

// Chequeo para OPERAR sobre una venta (marcar una cuota cobrada,
// completar las partes, eliminarla), no solo para listarla. Sin esto el
// alcance se saltaba mandando el id de otra venta en el form: la lista
// la escondía, pero la acción la aceptaba igual.
export async function assertSaleInScope(saleId: number, profile: Profile): Promise<void> {
  const agentId = cajaOwnerId(profile);
  if (agentId === null) return;

  const sale = await withRetry(() =>
    prisma.sale.findUnique({
      where: { id: saleId },
      select: { createdById: true, vendedorAgentId: true, captadorAgentId: true },
    })
  );
  if (!sale) throw new Error("La venta no existe.");
  if (sale.createdById !== agentId && sale.vendedorAgentId !== agentId && sale.captadorAgentId !== agentId) {
    throw new Error("No tenés acceso a esta venta — no participaste en la operación.");
  }
}

export async function assertRentalCommissionInScope(commissionId: number, profile: Profile): Promise<void> {
  const agentId = cajaOwnerId(profile);
  if (agentId === null) return;

  const commission = await withRetry(() =>
    prisma.rentalCommission.findUnique({
      where: { id: commissionId },
      select: { createdById: true, vendedorAgentId: true, captadorAgentId: true },
    })
  );
  if (!commission) throw new Error("La comisión no existe.");
  if (
    commission.createdById !== agentId &&
    commission.vendedorAgentId !== agentId &&
    commission.captadorAgentId !== agentId
  ) {
    throw new Error("No tenés acceso a esta comisión — no participaste en la operación.");
  }
}

// Las tasaciones no tienen captador (ver el modelo Appraisal): la regla
// se evalúa con creador y vendedor nada más.
export async function assertAppraisalInScope(appraisalId: number, profile: Profile): Promise<void> {
  const agentId = cajaOwnerId(profile);
  if (agentId === null) return;

  const appraisal = await withRetry(() =>
    prisma.appraisal.findUnique({
      where: { id: appraisalId },
      select: { createdById: true, vendedorAgentId: true },
    })
  );
  if (!appraisal) throw new Error("La tasación no existe.");
  if (appraisal.createdById !== agentId && appraisal.vendedorAgentId !== agentId) {
    throw new Error("No tenés acceso a esta tasación — no participaste en la operación.");
  }
}

// Idem para una cuota de comisión: resuelve de qué venta o comisión de
// alquiler viene y delega.
export async function assertInstallmentInScope(installmentId: number, profile: Profile): Promise<void> {
  if (cajaOwnerId(profile) === null) return;

  const installment = await withRetry(() =>
    prisma.commissionInstallment.findUnique({
      where: { id: installmentId },
      select: { saleId: true, rentalCommissionId: true },
    })
  );
  if (!installment) throw new Error("La cuota no existe.");
  if (installment.saleId !== null) return assertSaleInScope(installment.saleId, profile);
  if (installment.rentalCommissionId !== null) {
    return assertRentalCommissionInScope(installment.rentalCommissionId, profile);
  }
}

// Cualquier perfil puede ver su propio saldo en Pagos a agentes — ver
// el de OTRO agente pide agentes.ver_todos.
export async function requireSelfOrAgentesVerTodos(targetAgentId: string): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.id !== targetAgentId && !profile.permissions.includes("agentes.ver_todos")) {
    redirect("/backoffice/agentes");
  }
  return profile;
}

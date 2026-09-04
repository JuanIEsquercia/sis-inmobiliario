import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
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
  // fila solo importa para AGENTE, donde sí es granular por usuario.
  return profile.role === "ADMIN" ? { ...profile, permissions: ALL_PERMISSION_KEYS } : profile;
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

export async function getContractGroupScope(profile: Profile): Promise<ContractGroupScope> {
  if (profile.permissions.includes("administraciones.ver_todos")) return "all";
  const memberships = await withRetry(() =>
    prisma.profileContractGroup.findMany({ where: { profileId: profile.id }, select: { groupId: true } })
  );
  return memberships.map((m) => m.groupId);
}

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

// Cualquier perfil puede ver su propio saldo en Pagos a agentes — ver
// el de OTRO agente pide agentes.ver_todos.
export async function requireSelfOrAgentesVerTodos(targetAgentId: string): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.id !== targetAgentId && !profile.permissions.includes("agentes.ver_todos")) {
    redirect("/backoffice/agentes");
  }
  return profile;
}

import { requireProfile, getContractGroupScope, cajaOwnerId } from "@/lib/auth";
import { getAlertsSummary } from "@/lib/dashboard";
import { contarLlavesSinDevolver, puedeGestionarLlaves } from "@/lib/visitas";
import { AlertsBell } from "./AlertsBell";

// La campanita de Alertas pide ~11 consultas (indexaciones vencidas,
// contratos por vencer, morosidad, cobros atrasados por cada fuente).
// Antes eso se resolvía en el layout, con await: o sea que NINGUNA
// página del backoffice podía empezar a pintarse hasta que terminaran
// esas 11 consultas, aunque la página que estabas abriendo no tuviera
// nada que ver con las alertas.
//
// Ahora vive acá, envuelto en Suspense desde el layout: el shell
// (sidebar, header, buscador) y el contenido de la página salen de una,
// y el numerito de la campanita entra solo cuando está listo. Nadie
// espera por él.
export async function AlertsBellSlot() {
  const profile = await requireProfile();
  const canAdmin = profile.permissions.includes("administraciones.ver");
  const canCaja = profile.permissions.includes("caja.ver");
  const canLlaves = profile.permissions.includes("visitas.pedir");
  if (!canAdmin && !canCaja && !canLlaves) return null;

  // Mismo alcance por agente que las listas de Caja: el numerito de la
  // campanita no puede contar cobros atrasados de operaciones que quien
  // mira no puede ni ver.
  const [alerts, llavesSinDevolver] = await Promise.all([
    canAdmin || canCaja
      ? getAlertsSummary(await getContractGroupScope(profile), canAdmin, canCaja, cajaOwnerId(profile))
      : Promise.resolve(null),
    // Llaves de la inmobiliaria que no volvieron el día de la visita:
    // quien gestiona llaves ve todas; cada vendedor, las que tiene él.
    canLlaves ? contarLlavesSinDevolver(puedeGestionarLlaves(profile) ? null : profile.id) : Promise.resolve(0),
  ]);

  return (
    <AlertsBell
      alerts={alerts}
      canAdmin={canAdmin}
      canCaja={canCaja}
      llaves={canLlaves ? { count: llavesSinDevolver, gestor: puedeGestionarLlaves(profile) } : null}
    />
  );
}

// Hueco del mismo tamaño que el botón real, para que el header no
// "salte" cuando la campanita termina de cargar.
export function AlertsBellFallback() {
  return (
    <div
      aria-hidden
      className="h-9 w-9 flex-none rounded-xl border border-border/40 bg-surface/40"
    />
  );
}

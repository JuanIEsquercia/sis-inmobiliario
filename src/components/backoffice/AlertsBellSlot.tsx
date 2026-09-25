import { requireProfile, getContractGroupScope } from "@/lib/auth";
import { getAlertsSummary } from "@/lib/dashboard";
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
  if (!canAdmin && !canCaja) return null;

  const alerts = await getAlertsSummary(await getContractGroupScope(profile), canAdmin, canCaja);

  return <AlertsBell alerts={alerts} canAdmin={canAdmin} canCaja={canCaja} />;
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

import type { Metadata } from "next";
import { requireProfile, getContractGroupScope } from "@/lib/auth";
import { getAlertsSummary } from "@/lib/dashboard";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";

// robots.ts ya excluye /backoffice de rastreo — esto es la segunda
// línea de defensa: si algún link externo apunta para acá igual, Google
// no lo indexa (a diferencia de un disallow solo, que evita rastrear
// pero no garantiza que una URL ya conocida no aparezca sin contenido).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  // Se pide acá (no en cada page) para que el numerito de la campanita
  // del header esté disponible sin importar en qué sección del
  // backoffice se entre — este layout es compartido por todas.
  const canAdmin = profile.permissions.includes("administraciones.ver");
  const canCaja = profile.permissions.includes("caja.ver");
  const alerts =
    canAdmin || canCaja
      ? await getAlertsSummary(await getContractGroupScope(profile), { canAdmin, canCaja })
      : null;

  return (
    <BackofficeShell profile={profile} alerts={alerts}>
      {children}
    </BackofficeShell>
  );
}


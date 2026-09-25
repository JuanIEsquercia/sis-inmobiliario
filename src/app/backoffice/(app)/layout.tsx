import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";
import { AlertsBellSlot, AlertsBellFallback } from "@/components/backoffice/AlertsBellSlot";

// robots.ts ya excluye /backoffice de rastreo — esto es la segunda
// línea de defensa: si algún link externo apunta para acá igual, Google
// no lo indexa (a diferencia de un disallow solo, que evita rastrear
// pero no garantiza que una URL ya conocida no aparezca sin contenido).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  // Lo único que este layout espera de verdad: quién está logueado (una
  // consulta, memoizada por request con cache(), así que las páginas de
  // abajo la reusan sin volver a pedirla).
  //
  // Las alertas de la campanita NO se esperan acá: van en su propio
  // Suspense (ver AlertsBellSlot). Antes se resolvían con await en este
  // mismo lugar, y como este layout es compartido por todo el
  // backoffice, sus ~11 consultas se pagaban antes de poder pintar
  // cualquier página — incluso una que no mostrara ninguna alerta.
  const profile = await requireProfile();

  return (
    <BackofficeShell
      profile={profile}
      alertsSlot={
        <Suspense fallback={<AlertsBellFallback />}>
          <AlertsBellSlot />
        </Suspense>
      }
    >
      {children}
    </BackofficeShell>
  );
}

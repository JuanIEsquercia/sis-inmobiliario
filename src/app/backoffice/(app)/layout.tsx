import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";

// robots.ts ya excluye /backoffice de rastreo — esto es la segunda
// línea de defensa: si algún link externo apunta para acá igual, Google
// no lo indexa (a diferencia de un disallow solo, que evita rastrear
// pero no garantiza que una URL ya conocida no aparezca sin contenido).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <BackofficeShell profile={profile}>
      {children}
    </BackofficeShell>
  );
}


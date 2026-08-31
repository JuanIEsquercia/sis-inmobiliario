import { requireProfile } from "@/lib/auth";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <BackofficeShell profile={profile}>
      {children}
    </BackofficeShell>
  );
}


import { requireProfile } from "@/lib/auth";
import { Sidebar } from "@/components/backoffice/Sidebar";
import { LogoutButton } from "@/components/backoffice/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="text-sm font-medium text-foreground">Backoffice — Garcia Propiedades</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">
            @{profile.username} · {profile.role === "ADMIN" ? "Admin" : "Agente"}
          </span>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar permissions={profile.permissions} />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}

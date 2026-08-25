import { requireProfile } from "@/lib/auth";
import { Sidebar } from "@/components/backoffice/Sidebar";
import { LogoutButton } from "@/components/backoffice/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const userInitials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-6 py-3 shadow-sm">
        <div className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span>Panel Inmobiliario</span>
          <span className="text-muted/65 font-normal">|</span>
          <span className="text-xs font-medium text-muted">Garcia Propiedades</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 pr-4 border-r border-border/60">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/5 border border-accent/15 text-accent text-xs font-bold shadow-sm select-none">
              {userInitials}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground leading-tight">@{profile.username}</span>
              <span className="text-[9px] font-bold text-muted uppercase tracking-wider leading-none">
                {profile.role === "ADMIN" ? "Administrador" : "Agente"}
              </span>
            </div>
          </div>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar permissions={profile.permissions} />
        <main className="flex-1 px-8 py-8 bg-background/50">{children}</main>
      </div>
    </div>
  );
}


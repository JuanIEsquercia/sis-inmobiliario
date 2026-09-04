import { LoginForm } from "@/components/backoffice/LoginForm";

interface PageProps {
  searchParams: Promise<{ motivo?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  // Llega con ?motivo=inactivo desde /backoffice/logout cuando una
  // sesión válida no tenía Profile o el usuario está desactivado — sin
  // este aviso, esa persona solo veía el login otra vez, sin saber por
  // qué la sacó.
  const { motivo } = await searchParams;
  const inactivo = motivo === "inactivo";

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-surface/40 px-6 py-20">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-8 shadow-premium flex flex-col gap-6">
        <div className="text-center flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
            Acceso Privado
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Backoffice
          </h1>
          <p className="text-xs text-muted">Garcia Propiedades · Gestión Inmobiliaria</p>
        </div>
        {inactivo && (
          <div className="rounded-lg bg-accent-soft border border-accent/15 px-3 py-2 text-xs text-accent font-medium">
            Tu usuario está desactivado o todavía no tiene perfil en el sistema — hablá con un administrador.
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
}


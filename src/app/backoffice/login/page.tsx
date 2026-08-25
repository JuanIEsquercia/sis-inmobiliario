import { LoginForm } from "@/components/backoffice/LoginForm";

export default function LoginPage() {
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
        <LoginForm />
      </div>
    </div>
  );
}


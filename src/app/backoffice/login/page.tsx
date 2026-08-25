import { LoginForm } from "@/components/backoffice/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-surface px-6 py-16">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-foreground">Backoffice</h1>
        <p className="text-sm text-muted">Garcia Propiedades</p>
      </div>
      <LoginForm />
    </div>
  );
}

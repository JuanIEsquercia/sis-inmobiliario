import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          Garcia Propiedades
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          <Link href="/propiedades" className="hover:text-foreground">
            Propiedades
          </Link>
        </nav>
      </div>
    </header>
  );
}

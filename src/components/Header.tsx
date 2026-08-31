import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link 
          href="/" 
          aria-label="Garcia Propiedades — inicio"
          className="transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <Logo />
        </Link>
        <nav className="flex items-center gap-8 text-sm font-medium text-muted">
          <Link 
            href="/" 
            className="transition-colors hover:text-accent"
          >
            Inicio
          </Link>
          <Link
            href="/propiedades"
            className="transition-colors hover:text-accent"
          >
            Propiedades
          </Link>
          <Link
            href="/equipo"
            className="transition-colors hover:text-accent"
          >
            Nuestro equipo
          </Link>
          <div className="pl-2 border-l border-border/60">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}


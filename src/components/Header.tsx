"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link 
          href="/" 
          aria-label="Garcia Propiedades — inicio"
          className="transition-opacity hover:opacity-90 active:scale-[0.98] shrink-0"
        >
          <Logo />
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
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

        {/* Acciones Móvil (ThemeToggle + Botón Hamburguesa) */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:text-foreground hover:bg-surface border border-border/50 cursor-pointer transition-colors"
            aria-label="Abrir menú de navegación"
          >
            {isMobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Desplegable de Menú Móvil */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-border/50 bg-surface/95 backdrop-blur-md px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-3 text-sm font-semibold text-foreground">
            <Link 
              href="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-background transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/propiedades"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-background transition-colors"
            >
              Propiedades
            </Link>
            <Link
              href="/equipo"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-background transition-colors"
            >
              Nuestro equipo
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

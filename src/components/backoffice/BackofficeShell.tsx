"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Profile {
  username: string;
  role: string;
  permissions: string[];
}

interface BackofficeShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function BackofficeShell({ profile, children }: BackofficeShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userInitials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Header Responsivo */}
      <header className="print:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-4 py-3 md:px-6 shadow-sm">
        <div className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          {/* Botón Hamburguesa en Mobile */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface/60 cursor-pointer transition-colors"
            aria-label="Abrir menú"
          >
            <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="hidden sm:inline">Panel Inmobiliario</span>
          <span className="text-muted/65 font-normal hidden sm:inline">|</span>
          <span className="text-xs font-medium text-muted truncate max-w-[120px] sm:max-w-none">Garcia Propiedades</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 pr-3 sm:pr-4 border-r border-border/60">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/5 border border-accent/15 text-accent text-xs font-bold shadow-sm select-none flex-none">
              {userInitials}
            </div>
            <div className="hidden sm:flex flex-col">
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

      {/* Área del Layout Principal */}
      <div className="flex flex-1 relative">
        {/* Backdrop (Fondo Oscuro) en Mobile al Abrir Menú */}
        <div
          className={`
            fixed inset-0 z-45 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden
            ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          `}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Contenedor del Sidebar con Altura Completa y Tonalidad Unificada */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-60 transform border-r border-border/50 bg-surface transition-transform duration-300 md:relative md:translate-x-0 md:z-auto md:bg-surface/20
            ${isSidebarOpen ? "translate-x-0 shadow-premium" : "-translate-x-full md:shadow-none"}
            flex flex-col print:hidden self-stretch
          `}
        >
          {/* Header del Sidebar Móvil con Botón Cerrar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 md:hidden flex-none">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Navegación</span>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface/80 cursor-pointer"
              aria-label="Cerrar menú"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menú Sidebar */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <Sidebar permissions={profile.permissions} onLinkClick={() => setIsSidebarOpen(false)} />
          </div>
        </aside>

        {/* Contenido Principal */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 bg-background/50 print:p-0 overflow-x-hidden w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

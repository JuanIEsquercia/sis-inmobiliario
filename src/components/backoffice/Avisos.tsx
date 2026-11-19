"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// Avisos flotantes del backoffice ("✓ Cobro registrado", o el error).
//
// Viven en el shell (BackofficeShell), que no se desmonta al navegar:
// por eso un aviso sobrevive a un redirect — crear una venta te lleva a
// la ficha nueva y el "✓ Venta creada" sigue en pantalla.

type Tipo = "exito" | "error";

interface Aviso {
  id: number;
  tipo: Tipo;
  texto: string;
}

interface AvisosApi {
  exito: (texto: string) => void;
  error: (texto: string) => void;
}

const AvisosContext = createContext<AvisosApi | null>(null);

// Un error se lee con más calma que una confirmación: queda más tiempo.
const DURACION_MS: Record<Tipo, number> = { exito: 3500, error: 8000 };
const MAXIMO_EN_PANTALLA = 3;

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(0);

  const cerrar = useCallback((id: number) => {
    setAvisos((actuales) => actuales.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo: Tipo, texto: string) => {
      const id = ++siguienteId.current;
      setAvisos((actuales) => [...actuales, { id, tipo, texto }].slice(-MAXIMO_EN_PANTALLA));
      setTimeout(() => cerrar(id), DURACION_MS[tipo]);
    },
    [cerrar]
  );

  const api = useMemo<AvisosApi>(
    () => ({ exito: (t) => mostrar("exito", t), error: (t) => mostrar("error", t) }),
    [mostrar]
  );

  return (
    <AvisosContext.Provider value={api}>
      {children}
      <div
        className="print:hidden pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            // alert interrumpe al lector de pantalla (un error hay que
            // leerlo ya); status espera su turno.
            role={a.tipo === "error" ? "alert" : "status"}
            className={`aviso-entrada pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-premium ${
              a.tipo === "exito"
                ? "border-emerald-500/30 bg-surface text-foreground"
                : "border-destructive/40 bg-surface text-foreground"
            }`}
          >
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold text-white ${
                a.tipo === "exito" ? "bg-emerald-600" : "bg-destructive"
              }`}
            >
              {a.tipo === "exito" ? "✓" : "!"}
            </span>
            <span className="flex-1 leading-snug">{a.texto}</span>
            <button
              type="button"
              onClick={() => cerrar(a.id)}
              className="-mr-1 flex-none rounded p-0.5 text-muted hover:text-foreground cursor-pointer"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  );
}

// Fuera del backoffice (no debería pasar) no rompe: los avisos
// simplemente no se ven.
const SIN_AVISOS: AvisosApi = { exito: () => {}, error: () => {} };

export function useAvisos(): AvisosApi {
  return useContext(AvisosContext) ?? SIN_AVISOS;
}

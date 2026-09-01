"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const monthAbbr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Piloto: reemplaza el <input type="month"> nativo (cuyo popup lo dibuja
// el sistema operativo, imposible de restylear) por un panel propio —
// mismo trigger visual que MonthPicker, pero el calendario que se abre
// es HTML/CSS nuestro. Si funciona bien acá, se generaliza al resto de
// los calendarios de la app; por ahora vive aparte para no tocar los
// otros usos de MonthPicker mientras se evalúa.
export function CustomMonthPicker({ month, year, basePath }: { month: number; year: number; basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggleOpen() {
    setViewYear(year); // arranca siempre desde el mes/año actualmente elegido
    setOpen((o) => !o);
  }

  function selectMonth(m: number) {
    setOpen(false);
    router.push(`${basePath}?mes=${m}&anio=${viewYear}`);
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-surface px-3.5 py-2 text-xs font-bold text-foreground shadow-xs transition-all hover:border-accent hover:bg-accent-soft/30 cursor-pointer"
      >
        <svg className="h-4 w-4 flex-none text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>
          {monthNames[month - 1]} {year}
        </span>
        <svg
          className={`ml-1 h-3.5 w-3.5 flex-none text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir mes"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-2xl border border-border/60 bg-surface p-4 shadow-premium"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="Año anterior"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft/40 hover:text-accent cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-foreground">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="Año siguiente"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft/40 hover:text-accent cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {monthAbbr.map((label, idx) => {
              const m = idx + 1;
              const isSelected = m === month && viewYear === year;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMonth(m)}
                  aria-current={isSelected ? "true" : undefined}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-foreground hover:bg-accent-soft/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

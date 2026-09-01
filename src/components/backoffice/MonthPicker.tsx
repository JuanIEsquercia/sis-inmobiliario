"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function MonthPicker({ month, year, basePath }: { month: number; year: number; basePath: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const value = `${year}-${String(month).padStart(2, "0")}`;

  const handleOpenPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      if (typeof (el as unknown as { showPicker?: () => void }).showPicker === "function") {
        (el as unknown as { showPicker: () => void }).showPicker();
      } else {
        el.focus();
      }
    } catch {
      el.focus();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleOpenPicker}
        className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-surface px-3.5 py-2 text-xs font-bold text-foreground shadow-xs hover:border-accent hover:bg-accent-soft/30 transition-all cursor-pointer"
        title="Cambiar mes"
      >
        <svg className="h-4 w-4 text-accent flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{monthNames[month - 1]} {year}</span>
        <svg className="h-3.5 w-3.5 text-muted flex-none ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="month"
        defaultValue={value}
        onChange={(e) => {
          if (!e.target.value) return;
          const [y, m] = e.target.value.split("-");
          router.push(`${basePath}?mes=${Number(m)}&anio=${y}`);
        }}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}

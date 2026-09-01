"use client";

import { useEffect, useRef, useState } from "react";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const weekDays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const fmtLabel = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

interface ParsedDate {
  y: number;
  m: number; // 1-12
  d: number;
}

function parseISO(s: string | undefined): ParsedDate | null {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Lunes=0..Domingo=6 (Date.getDay() nativo es Domingo=0..Sábado=6).
function firstWeekdayOffset(y: number, m: number): number {
  return (new Date(y, m - 1, 1).getDay() + 6) % 7;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

// Reemplaza <input type="date"> nativo (popup dibujado por el sistema
// operativo, no restyleable) por un calendario propio. Soporta modo
// controlado (value/onChange, para state que vive en el padre — ver
// CuotaRowFields) y no controlado (defaultValue, el caso común de un
// campo suelto en un <form action={...}> de Server Action) — mismo
// criterio que un <input> nativo. Siempre termina mandando el valor por
// un input oculto con el mismo `name` y formato "YYYY-MM-DD" que ya lee
// el servidor, así que no hace falta tocar ninguna acción para usarlo.
export function DatePicker({
  name,
  id,
  defaultValue,
  value: controlledValue,
  onChange,
  required,
  disabled,
  className = "field",
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = isControlled ? controlledValue : internalValue;

  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => parseISO(value)?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseISO(value)?.m ?? today.getMonth() + 1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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

  function setValue(v: string) {
    if (isControlled) onChange?.(v);
    else setInternalValue(v);
  }

  function toggleOpen() {
    if (disabled) return;
    const parsed = parseISO(value);
    setViewYear(parsed?.y ?? today.getFullYear());
    setViewMonth(parsed?.m ?? today.getMonth() + 1);
    setOpen((o) => !o);
  }

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function selectDay(d: number) {
    setValue(toISO(viewYear, viewMonth, d));
    setOpen(false);
  }

  function selectToday() {
    setValue(toISO(today.getFullYear(), today.getMonth() + 1, today.getDate()));
    setOpen(false);
  }

  const parsedValue = parseISO(value);
  const label = parsedValue
    ? fmtLabel.format(new Date(parsedValue.y, parsedValue.m - 1, parsedValue.d))
    : "Elegir fecha";

  const offset = firstWeekdayOffset(viewYear, viewMonth);
  const total = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <div ref={containerRef} className="relative inline-flex w-full">
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center gap-2 text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <svg className="h-4 w-4 flex-none text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={parsedValue ? "" : "text-muted"}>{label}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir fecha"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-2xl border border-border/60 bg-surface p-4 shadow-premium"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft/40 hover:text-accent cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-foreground">
              {monthNames[viewMonth - 1]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft/40 hover:text-accent cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {weekDays.map((wd) => (
              <span key={wd} className="text-center text-[10px] font-bold uppercase tracking-wide text-muted">
                {wd}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, idx) => {
              if (d === null) return <span key={`blank-${idx}`} />;
              const isSelected = !!parsedValue && parsedValue.y === viewYear && parsedValue.m === viewMonth && parsedValue.d === d;
              const isToday =
                today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth && today.getDate() === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => selectDay(d)}
                  aria-current={isSelected ? "true" : undefined}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : isToday
                        ? "text-accent ring-1 ring-inset ring-accent/40"
                        : "text-foreground hover:bg-accent-soft/40"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={selectToday}
            className="mt-3 w-full rounded-lg border border-border/60 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent-soft/40 cursor-pointer"
          >
            Hoy
          </button>
        </div>
      )}
    </div>
  );
}

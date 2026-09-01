"use client";

import { useEffect, useRef, useState } from "react";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const weekDays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

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

function isoToDisplay(s: string): string {
  const p = parseISO(s);
  if (!p) return "";
  return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
}

// Deja tipear solo dígitos e inserta las barras solo — "15031985" se ve
// como "15/03/1985" a medida que se escribe, sin que el usuario tenga
// que tipear la barra. Corta en 8 dígitos (ddmmaaaa).
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("/");
}

// Recién se acepta como fecha real cuando están los 8 dígitos y forman
// una fecha que existe (rechaza, por ejemplo, 31/02) — mientras tanto
// (fecha a medio tipear) no se toca el valor todavía guardado.
function parseTypedDate(masked: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return toISO(year, month, day);
}

const YEAR_RANGE_PAST = 100;
const YEAR_RANGE_FUTURE = 10;

// Reemplaza <input type="date"> nativo (popup dibujado por el sistema
// operativo, no restyleable) por un calendario propio. Se puede tanto
// tipear la fecha a mano (dd/mm/aaaa, de a dígitos) como elegirla del
// calendario — los combos de mes/año permiten saltar directo en vez de
// tener que ir mes a mes (pensado para fechas de nacimiento, donde eso
// significa clickear "mes anterior" cientos de veces). Soporta modo
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

  const [inputText, setInputText] = useState(() => isoToDisplay(value));
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => parseISO(value)?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseISO(value)?.m ?? today.getMonth() + 1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mantiene el texto tipeado sincronizado cuando el valor cambia desde
  // afuera (se eligió un día del calendario, o el padre lo actualizó en
  // modo controlado) — mientras se está tipeando una fecha incompleta,
  // `value` todavía no cambió, así que esto no pisa lo que se va
  // escribiendo. Ajuste durante el render (no en un efecto) siguiendo el
  // patrón de React para "adjust state when a prop changes".
  const [lastSyncedValue, setLastSyncedValue] = useState(value);
  if (value !== lastSyncedValue) {
    setLastSyncedValue(value);
    setInputText(isoToDisplay(value));
  }

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

  const [openUpwards, setOpenUpwards] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  function openCalendar() {
    if (disabled) return;
    const parsed = parseISO(value);
    setViewYear(parsed?.y ?? today.getFullYear());
    setViewMonth(parsed?.m ?? today.getMonth() + 1);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Abrir hacia arriba si hay menos de 360px abajo y suficiente espacio arriba
      setOpenUpwards(viewportHeight - rect.bottom < 360 && rect.top > 300);
      // Alinear a la derecha si hay menos de 330px hacia la derecha
      setAlignRight(viewportWidth - rect.left < 330);
    }

    setOpen(true);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskDateInput(e.target.value);
    setInputText(masked);

    const digits = masked.replace(/\D/g, "");
    if (digits.length === 0) {
      setValue("");
      return;
    }
    if (digits.length === 8) {
      const parsed = parseTypedDate(masked);
      if (parsed) {
        setValue(parsed);
        const p = parseISO(parsed)!;
        setViewYear(p.y);
        setViewMonth(p.m);
      }
    }
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
  const offset = firstWeekdayOffset(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const years = Array.from(
    { length: YEAR_RANGE_PAST + YEAR_RANGE_FUTURE + 1 },
    (_, i) => today.getFullYear() - YEAR_RANGE_PAST + i
  );

  return (
    <div ref={containerRef} className="relative inline-flex w-full">
      <input type="hidden" name={name} value={value} required={required} />

      <div className="relative w-full">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <input
          type="text"
          inputMode="numeric"
          id={id}
          disabled={disabled}
          value={inputText}
          onChange={handleTextChange}
          onFocus={openCalendar}
          placeholder="dd/mm/aaaa"
          autoComplete="off"
          className={`w-full pl-9 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        />
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir fecha"
          className={`absolute z-50 w-80 max-w-[90vw] rounded-3xl border border-border/70 bg-surface/95 p-4 sm:p-5 shadow-premium backdrop-blur-md animate-fadeIn ${
            openUpwards ? "bottom-[calc(100%+0.5rem)] top-auto" : "top-[calc(100%+0.5rem)] bottom-auto"
          } ${alignRight ? "right-0 left-auto" : "left-0 right-auto"}`}
        >
          {/* Fila 1: Navegación Mes Anterior / Título / Siguiente */}
          <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-xl border border-border/60 text-muted transition-colors hover:bg-accent-soft/40 hover:text-accent cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-sm font-extrabold tracking-tight text-foreground text-center flex-1">
              {monthNames[viewMonth - 1]} {viewYear}
            </span>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-border/60 text-muted transition-colors hover:bg-accent-soft/40 hover:text-accent cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Fila 2: Selectores de Salto Directo (Mes y Año amplios) */}
          <div className="mb-3 flex items-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              aria-label="Mes"
              className="field flex-1 py-1.5 px-3 text-xs font-bold bg-surface text-foreground rounded-xl border border-border/80 cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1} className="bg-surface text-foreground">
                  {name}
                </option>
              ))}
            </select>

            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              aria-label="Año"
              className="field flex-1 py-1.5 px-3 text-xs font-bold bg-surface text-foreground rounded-xl border border-border/80 cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-surface text-foreground">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {weekDays.map((wd) => (
              <span key={wd} className="text-center text-[11px] font-bold uppercase tracking-wide text-muted/80">
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
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-accent text-accent-foreground shadow-sm scale-95"
                      : isToday
                        ? "text-accent ring-1 ring-inset ring-accent/40 font-extrabold"
                        : "text-foreground hover:bg-accent-soft/50"
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
            className="mt-3 w-full rounded-xl border border-border/70 bg-background/50 py-2 text-xs font-bold text-foreground transition-all hover:bg-accent-soft/40 hover:text-accent cursor-pointer"
          >
            Hoy
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buscarGlobal, type GlobalSearchResult } from "@/app/backoffice/(app)/actions";

const kindLabels: Record<GlobalSearchResult["kind"], string> = {
  contrato: "Contratos",
  cliente: "Clientes",
  unidad: "Propiedades",
  venta: "Ventas",
  presupuesto: "Presupuestos",
};

export function GlobalSearch() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  function open() {
    if (dialogRef.current?.open) return;
    dialogRef.current?.showModal();
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const handle = setTimeout(() => {
      startTransition(async () => {
        setResults(await buscarGlobal(query));
        setActiveIndex(0);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const visibleResults = query.trim().length >= 2 ? results : [];

  function goTo(result: GlobalSearchResult) {
    dialogRef.current?.close();
    router.push(result.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visibleResults[activeIndex]) goTo(visibleResults[activeIndex]);
    }
  }

  const groups = (["contrato", "cliente", "unidad", "venta", "presupuesto"] as const)
    .map((kind) => ({ kind, items: visibleResults.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0);

  let flatIdx = -1;

  return (
    <>
      {/* Botón Trigger en el Header de Ancho Ampliado y Efecto Premium */}
      <button
        type="button"
        onClick={open}
        className="group relative flex h-10 sm:h-11 w-44 sm:w-64 md:w-80 lg:w-[22rem] items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface/80 px-3.5 text-xs text-muted shadow-xs transition-all duration-300 hover:border-accent/40 hover:bg-surface hover:shadow-md hover:shadow-accent/5 cursor-pointer ring-1 ring-white/5"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <svg
            className="h-4 w-4 flex-none text-accent transition-transform duration-200 group-hover:scale-110"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.3-4.3" />
          </svg>
          <span className="truncate font-semibold text-foreground/80 group-hover:text-foreground text-xs sm:text-sm">
            Buscar en el sistema…
          </span>
        </div>

        <kbd className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-border/70 bg-background/90 px-2 py-0.5 text-[11px] font-bold text-muted/90 group-hover:border-accent/30 group-hover:text-accent transition-colors shadow-2xs flex-none">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </button>

      {/* Modal Diálogo de Búsqueda Global */}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto z-50 w-[calc(100%-2rem)] max-w-2xl rounded-3xl border border-border/70 bg-surface/95 p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm animate-fadeIn"
      >
        <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4.5">
          <svg className="h-5 w-5 flex-none text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Buscar contratos, clientes, propiedades, ventas o presupuestos..."
            className="flex-1 bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-xl px-2 py-1 text-xs font-bold text-muted hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer"
            >
              Borrar
            </button>
          )}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-xl p-1.5 text-muted hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer flex-none"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto p-3">
          {pending && <p className="px-4 py-3 text-xs font-semibold text-muted">Buscando en el sistema…</p>}

          {!pending && query.trim().length >= 2 && visibleResults.length === 0 && (
            <p className="px-4 py-8 text-center text-sm font-medium text-muted">
              No se encontraron resultados para &quot;{query}&quot;.
            </p>
          )}

          {!pending && query.trim().length < 2 && (
            <div className="px-4 py-8 text-center text-xs font-medium text-muted/70 flex flex-col items-center gap-1">
              <span>Escribí al menos 2 letras para buscar en todo el sistema</span>
              <span className="text-[10px] text-muted/50">Podés buscar por DNI, dirección, apellido o código de propiedad</span>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.kind} className="mb-3 last:mb-0">
              <p className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted/80">
                {kindLabels[group.kind]}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  flatIdx++;
                  const isActive = flatIdx === activeIndex;
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => goTo(item)}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition-all duration-150 cursor-pointer flex items-center justify-between ${
                          isActive ? "bg-accent-soft text-foreground shadow-xs border border-accent/20" : "hover:bg-background/60"
                        }`}
                      >
                        <div>
                          <span className="block font-bold text-foreground">{item.title}</span>
                          <span className="block text-xs font-medium text-muted">{item.subtitle}</span>
                        </div>
                        <svg className={`h-4 w-4 text-accent transition-transform ${isActive ? "translate-x-1" : "opacity-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer con indicaciones de teclado */}
        <div className="flex items-center justify-between border-t border-border/50 px-6 py-2.5 bg-background/40 rounded-b-3xl text-[11px] font-semibold text-muted/80">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-border/60 bg-surface px-1 py-0.5 text-[10px]">↑↓</kbd> Navegar</span>
            <span><kbd className="rounded border border-border/60 bg-surface px-1 py-0.5 text-[10px]">↵</kbd> Seleccionar</span>
          </div>
          <span><kbd className="rounded border border-border/60 bg-surface px-1 py-0.5 text-[10px]">Esc</kbd> Cerrar</span>
        </div>
      </dialog>
    </>
  );
}

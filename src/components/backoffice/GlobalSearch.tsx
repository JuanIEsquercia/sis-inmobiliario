"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buscarGlobal, type GlobalSearchResult } from "@/app/backoffice/(app)/actions";

const kindLabels: Record<GlobalSearchResult["kind"], string> = {
  contrato: "Contratos",
  cliente: "Clientes",
  unidad: "Propiedades",
  venta: "Ventas",
};

// Buscador global del header — Ctrl/Cmd+K desde cualquier pantalla del
// backoffice, o el botón de la barra superior. Los resultados ya vienen
// agrupados y filtrados por permiso desde el server action
// (buscarGlobal); acá solo se pintan y se navega al elegir uno.
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
    // El dialog recién se pinta este mismo tick — pedir el foco un frame
    // después para que el navegador ya lo tenga montado.
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
    // Con menos de 2 letras no hay nada que buscar — se deja de largo,
    // sin tocar `results` acá (ver `visibleResults` más abajo, que es
    // quien realmente decide qué se pinta).
    if (query.trim().length < 2) return;
    const handle = setTimeout(() => {
      startTransition(async () => {
        setResults(await buscarGlobal(query));
        setActiveIndex(0);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  // `results` puede quedar con la última búsqueda de un query más largo
  // aunque el usuario haya borrado texto después — nunca se muestran
  // resultados de una búsqueda que ya no corresponde al texto actual.
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

  const groups = (["contrato", "cliente", "unidad", "venta"] as const)
    .map((kind) => ({ kind, items: visibleResults.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0);

  // Índice plano → posición dentro del listado agrupado, para resaltar
  // el activeIndex correcto sin importar en qué grupo cae.
  let flatIdx = -1;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/60 px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
      >
        <svg className="h-3.5 w-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="hidden sm:inline rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted">
          Ctrl K
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto z-50 w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border/60 bg-surface p-0 text-foreground shadow-premium backdrop:bg-black/50 backdrop:backdrop-blur-xs"
      >
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
          <svg className="h-4 w-4 flex-none text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Buscar un contrato, cliente, propiedad o venta..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted/60"
          />
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg p-1 text-muted hover:text-foreground hover:bg-background/60 cursor-pointer flex-none"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {pending && <p className="px-3 py-2 text-xs text-muted">Buscando…</p>}

          {!pending && query.trim().length >= 2 && visibleResults.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted">Sin resultados para &quot;{query}&quot;.</p>
          )}

          {!pending && query.trim().length < 2 && (
            <p className="px-3 py-6 text-center text-xs text-muted/70">Escribí al menos 2 letras para buscar.</p>
          )}

          {groups.map((group) => (
            <div key={group.kind} className="mb-2 last:mb-0">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted/70">
                {kindLabels[group.kind]}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  flatIdx++;
                  const isActive = flatIdx === activeIndex;
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => goTo(item)}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                          isActive ? "bg-accent-soft" : "hover:bg-background/60"
                        }`}
                      >
                        <span className="block font-semibold text-foreground">{item.title}</span>
                        <span className="block text-xs text-muted">{item.subtitle}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </dialog>
    </>
  );
}

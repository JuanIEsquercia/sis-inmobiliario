"use client";

import { useEffect, useState, useTransition } from "react";
import { buscarUnidades } from "@/app/backoffice/(app)/administraciones/actions";
import { PROPERTY_TYPES } from "@/lib/property-types";

export interface UnitOption {
  id: number;
  propertyCode: string;
  address: string;
  city: string | null;
  propertyType: string | null;
}

// Mismo patrón de "buscar o crear" que ClientPicker, pero para Unit —
// el código de propiedad (Adinco) es la clave real de búsqueda, ya que
// es @unique en el schema.
export function UnitPicker({
  initialSelected = null,
  search = buscarUnidades,
}: {
  initialSelected?: UnitOption | null;
  search?: (query: string) => Promise<UnitOption[]>;
}) {
  const [selected, setSelected] = useState<UnitOption | null>(initialSelected);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnitOption[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    const handle = setTimeout(() => {
      startTransition(async () => {
        try {
          setResults(await search(query));
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo buscar");
        }
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query, selected, search]);

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-semibold text-foreground/80">Unidad de propiedad</span>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 shadow-2xs">
          <input type="hidden" name="unit.id" value={selected.id} />
          <div className="text-sm text-foreground">
            <span className="font-bold">{selected.propertyCode}</span>
            <span className="ml-2 text-xs font-medium text-muted">· {selected.address}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs font-semibold text-accent hover:text-accent-strong transition-colors cursor-pointer"
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/40 p-4 sm:p-5 shadow-2xs w-full">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Unidad de Propiedad</span>
        {!showNew && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            + Crear unidad nueva
          </button>
        )}
      </div>

      {!showNew && (
        <>
          <div className="relative w-full">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código de propiedad (Adinco) o dirección..."
              className="field w-full"
            />
          </div>
          {pending && <p className="text-xs text-muted">Buscando…</p>}
          {query.trim().length >= 2 && results.length > 0 && (
            <ul className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-surface p-1.5 shadow-sm max-h-48 overflow-y-auto">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(u);
                      setQuery("");
                      setResults([]);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-background transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-foreground">{u.propertyCode}</span>{" "}
                    <span className="text-xs text-muted">· {u.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {showNew && (
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-3.5 w-full">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold text-foreground/80">Código Adinco *</label>
              <input name="unit.propertyCode" placeholder="Ej. PROP-1234" required className="field w-full" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold text-foreground/80">Tipo de propiedad</label>
              <select name="unit.propertyType" defaultValue="" className="field w-full">
                <option value="" className="bg-surface text-foreground">Seleccionar tipo</option>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type} className="bg-surface text-foreground">
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold text-foreground/80">Dirección completa *</label>
              <input name="unit.address" placeholder="Calle, número, piso o depto" required className="field w-full" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold text-foreground/80">Ciudad</label>
              <input name="unit.city" placeholder="Ej. Corrientes" className="field w-full" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="w-fit text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer pt-1"
          >
            ← Volver a buscar unidad existente
          </button>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

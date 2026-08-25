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
export function UnitPicker({ initialSelected = null }: { initialSelected?: UnitOption | null }) {
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
          setResults(await buscarUnidades(query));
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo buscar");
        }
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query, selected]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
        <input type="hidden" name="unit.id" value={selected.id} />
        <div className="text-sm text-foreground">
          <span className="font-medium">{selected.propertyCode}</span>
          <span className="ml-2 text-muted">{selected.address}</span>
        </div>
        <button type="button" onClick={() => setSelected(null)} className="text-xs text-accent hover:underline">
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!showNew && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código Adinco o dirección..."
            className="field"
          />
          {pending && <p className="text-xs text-muted">Buscando…</p>}
          {query.trim().length >= 2 && results.length > 0 && (
            <ul className="flex flex-col gap-1">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(u);
                      setQuery("");
                      setResults([]);
                    }}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
                  >
                    <span className="font-medium">{u.propertyCode}</span>{" "}
                    <span className="text-muted">{u.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setShowNew(true)} className="w-fit text-xs text-accent hover:underline">
            + Unidad nueva
          </button>
        </>
      )}
      {showNew && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input name="unit.propertyCode" placeholder="Código de propiedad (Adinco)*" required className="field" />
          <input name="unit.address" placeholder="Dirección*" required className="field sm:col-span-2" />
          <input name="unit.city" placeholder="Ciudad" className="field" />
          <select name="unit.propertyType" defaultValue="" className="field">
            <option value="">Tipo</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="col-span-full w-fit text-xs text-muted hover:underline"
          >
            Buscar existente en su lugar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}

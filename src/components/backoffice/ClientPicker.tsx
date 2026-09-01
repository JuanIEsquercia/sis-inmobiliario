"use client";

import { useEffect, useState, useTransition } from "react";
import { buscarClientes } from "@/app/backoffice/(app)/administraciones/actions";
import { DatePicker } from "./DatePicker";

export interface ClientOption {
  id: number;
  firstName: string;
  lastName: string;
  docId: string | null;
}

// Selector de "buscar o crear" para un Client — se usa 3 veces en el
// alta de contrato (propietario, inquilino, cada garante). `namePrefix`
// fija el namespace de los campos (ej. "owner", "guarantors.0") y se
// concatena como `${namePrefix}.clientId`, `${namePrefix}.firstName`,
// etc. — createContract los lee con el mismo esquema vía resolveClient.
export function ClientPicker({
  namePrefix,
  roleLabel,
  initialSelected = null,
  search = buscarClientes,
}: {
  namePrefix: string;
  roleLabel: string;
  initialSelected?: ClientOption | null;
  search?: (query: string) => Promise<ClientOption[]>;
}) {
  const [selected, setSelected] = useState<ClientOption | null>(initialSelected);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
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

  const field = (suffix: string) => `${namePrefix}.${suffix}`;

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted">{roleLabel}</p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
          <input type="hidden" name={field("clientId")} value={selected.id} />
          <div className="text-sm text-foreground">
            <span className="font-medium">
              {selected.firstName} {selected.lastName}
            </span>
            {selected.docId && <span className="ml-2 text-muted">DNI {selected.docId}</span>}
          </div>
          <button type="button" onClick={() => setSelected(null)} className="text-xs text-accent hover:underline">
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <p className="text-xs text-muted">{roleLabel}</p>
      {!showNew && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            className="field"
          />
          {pending && <p className="text-xs text-muted">Buscando…</p>}
          {query.trim().length >= 2 && results.length > 0 && (
            <ul className="flex flex-col gap-1">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      setQuery("");
                      setResults([]);
                    }}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
                  >
                    {c.firstName} {c.lastName}
                    {c.docId && <span className="text-muted"> · DNI {c.docId}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setShowNew(true)} className="w-fit text-xs text-accent hover:underline">
            + Cliente nuevo
          </button>
        </>
      )}
      {showNew && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name={field("firstName")} placeholder="Nombre*" required className="field" />
          <input name={field("lastName")} placeholder="Apellido*" required className="field" />
          <input name={field("docId")} placeholder="DNI" className="field" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={field("birthDate")} className="text-xs text-muted">
              Fecha de nacimiento
            </label>
            <DatePicker id={field("birthDate")} name={field("birthDate")} />
          </div>
          <input name={field("phone")} placeholder="Teléfono" className="field" />
          <input name={field("email")} type="email" placeholder="Email" className="field" />
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

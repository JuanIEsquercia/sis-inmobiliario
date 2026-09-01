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
      <div className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-semibold text-foreground/80">{roleLabel}</span>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 shadow-2xs">
          <input type="hidden" name={field("clientId")} value={selected.id} />
          <div className="text-sm text-foreground">
            <span className="font-bold">
              {selected.firstName} {selected.lastName}
            </span>
            {selected.docId && <span className="ml-2 text-xs font-medium text-muted">· DNI {selected.docId}</span>}
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
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{roleLabel}</span>
        {!showNew && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            + Crear cliente nuevo
          </button>
        )}
      </div>

      {!showNew && (
        <>
          <div className="relative w-full">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, apellido o DNI..."
              className="field w-full"
            />
          </div>
          {pending && <p className="text-xs text-muted">Buscando…</p>}
          {query.trim().length >= 2 && results.length > 0 && (
            <ul className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-surface p-1.5 shadow-sm max-h-48 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      setQuery("");
                      setResults([]);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-background transition-colors cursor-pointer"
                  >
                    <span className="font-semibold text-foreground">{c.firstName} {c.lastName}</span>
                    {c.docId && <span className="text-xs text-muted ml-2">· DNI {c.docId}</span>}
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
              <label className="text-xs font-semibold text-foreground/80">Nombre *</label>
              <input name={field("firstName")} placeholder="Ej. Juan Carlos" required className="field w-full" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold text-foreground/80">Apellido *</label>
              <input name={field("lastName")} placeholder="Ej. Pérez" required className="field w-full" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold text-foreground/80">DNI / CUIT</label>
              <input name={field("docId")} placeholder="Número de documento sin puntos" className="field w-full" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold text-foreground/80">Teléfono</label>
              <input name={field("phone")} placeholder="Ej. 3794123456" className="field w-full" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-semibold text-foreground/80">Correo electrónico</label>
              <input name={field("email")} type="email" placeholder="ejemplo@correo.com" className="field w-full" />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label htmlFor={field("birthDate")} className="text-xs font-semibold text-foreground/80">
                Fecha de nacimiento
              </label>
              <DatePicker id={field("birthDate")} name={field("birthDate")} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNew(false)}
            className="w-fit text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer pt-1"
          >
            ← Volver a buscar cliente existente
          </button>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

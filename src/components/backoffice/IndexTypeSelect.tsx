"use client";

import { useState, useTransition } from "react";
import { crearIndexType } from "@/app/backoffice/(app)/administraciones/actions";

interface IndexTypeOption {
  id: number;
  code: string;
}

export function IndexTypeSelect({ initialIndexTypes }: { initialIndexTypes: IndexTypeOption[] }) {
  const [indexTypes, setIndexTypes] = useState(initialIndexTypes);
  const [adding, setAdding] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  function addIndexType() {
    if (!newCode.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await crearIndexType(newCode);
        setIndexTypes((prev) => (prev.some((i) => i.id === created.id) ? prev : [...prev, created]));
        setSelected(String(created.id));
        setNewCode("");
        setAdding(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el índice");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="indexTypeId" className="text-xs text-muted">
        Índice de actualización
      </label>
      <div className="flex items-center gap-2">
        <select
          id="indexTypeId"
          name="indexTypeId"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="field"
        >
          <option value="">Sin índice</option>
          {indexTypes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.code}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-sm text-accent hover:underline"
        >
          + Nuevo
        </button>
      </div>
      {adding && (
        <div className="flex items-center gap-2">
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Código (ej. UVA)"
            className="field w-40"
          />
          <button
            type="button"
            disabled={pending}
            onClick={addIndexType}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-60"
          >
            Agregar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}

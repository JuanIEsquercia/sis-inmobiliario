"use client";

import { useState, useTransition } from "react";
import { crearConcepto } from "@/app/backoffice/(app)/alquileres/actions";

interface ConceptOption {
  id: number;
  name: string;
}

export function ConceptsChecklist({ initialConcepts }: { initialConcepts: ConceptOption[] }) {
  const [concepts, setConcepts] = useState(initialConcepts);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function addConcept() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await crearConcepto(newName);
        setConcepts((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
        setCheckedIds((prev) => new Set(prev).add(created.id));
        setNewName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el concepto");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {concepts.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground"
          >
            <input
              type="checkbox"
              name="concepts"
              value={c.id}
              checked={checkedIds.has(c.id)}
              onChange={(e) => toggle(c.id, e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            {c.name}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nuevo concepto (ej. Cochera)"
          className="field w-56"
        />
        <button
          type="button"
          disabled={pending}
          onClick={addConcept}
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-60"
        >
          + Agregar
        </button>
      </div>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}

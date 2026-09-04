"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buscarConceptos, type ConceptOption } from "@/app/backoffice/(app)/presupuestos/actions";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface Row {
  key: number;
  description: string;
  amount: string;
}

interface RowProps {
  namePrefix: string;
  description: string;
  amount: string;
  onChange: (patch: Partial<{ description: string; amount: string }>) => void;
  onRemove?: () => void;
}

// Una fila del presupuesto: concepto (con autocompletado contra el
// catálogo de BudgetConcept) + importe. Elegir una sugerencia precarga
// también el importe sugerido — se puede editar igual antes de guardar.
function BudgetItemRow({ namePrefix, description, amount, onChange, onRemove }: RowProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ConceptOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Sin nada tipeado (o con el dropdown cerrado) no hay nada que
    // buscar — se deja de largo sin tocar `results` acá; `visibleResults`
    // más abajo es quien decide qué se pinta realmente. El try/catch es
    // clave: sin él, un error acá (permisos, un hipo de red) rechaza la
    // promesa en silencio y el dropdown simplemente nunca aparece, sin
    // ningún aviso — mismo criterio que ClientPicker.
    if (!open || description.trim().length < 1) return;
    const handle = setTimeout(() => {
      startTransition(async () => {
        try {
          setResults(await buscarConceptos(description));
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo buscar conceptos");
        }
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [description, open]);

  const visibleResults = open && description.trim().length >= 1 ? results : [];

  function pick(concept: ConceptOption) {
    onChange({
      description: concept.name,
      amount: concept.defaultAmount !== null ? String(concept.defaultAmount) : amount,
    });
    setOpen(false);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <input
          name={`${namePrefix}.description`}
          value={description}
          onChange={(e) => {
            onChange({ description: e.target.value });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Concepto (ej. Sellado de contrato)"
          autoComplete="off"
          className="field w-full"
        />
        {open && error && <p className="mt-1 text-[11px] font-semibold text-accent">{error}</p>}
        {visibleResults.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-xl border border-border/80 bg-surface p-1.5 shadow-sm max-h-48 overflow-y-auto">
            {visibleResults.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-background transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-foreground">{c.name}</span>
                  {c.defaultAmount !== null && (
                    <span className="text-xs text-muted ml-2">· {fmtMoney(c.defaultAmount)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        name={`${namePrefix}.amount`}
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => onChange({ amount: e.target.value })}
        placeholder="Importe"
        className="field w-full sm:w-36"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar concepto"
          className="flex-none rounded-lg border border-border px-2.5 py-2 text-xs text-muted hover:bg-surface cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Lista repetible de conceptos de un presupuesto — cada fila se guarda
// como `${namePrefix}.${key}.description` / `.amount`, leído del lado
// del servidor con la misma lógica que guarantorIndices (ver
// parseItemRows en presupuestos/actions.ts). `label` distingue a quién
// pertenece esta lista cuando hay más de una en la misma página (Venta:
// Comprador y Propietario, cada una independiente).
export function BudgetItemsFields({
  namePrefix,
  label,
  initialItems,
}: {
  namePrefix: string;
  label: string;
  initialItems?: { description: string; amount: string }[];
}) {
  const initial = initialItems && initialItems.length > 0 ? initialItems : [{ description: "", amount: "" }];
  const [rows, setRows] = useState<Row[]>(initial.map((item, i) => ({ key: i, ...item })));
  const nextKeyRef = useRef(initial.length);

  function addRow() {
    setRows((prev) => [...prev, { key: nextKeyRef.current++, description: "", amount: "" }]);
  }
  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }
  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/40 p-4 sm:p-5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      {rows.map((row) => (
        <BudgetItemRow
          key={row.key}
          namePrefix={`${namePrefix}.${row.key}`}
          description={row.description}
          amount={row.amount}
          onChange={(patch) => updateRow(row.key, patch)}
          onRemove={rows.length > 1 ? () => removeRow(row.key) : undefined}
        />
      ))}
      <button
        type="button"
        onClick={addRow}
        className="w-fit text-xs font-semibold text-accent hover:underline cursor-pointer"
      >
        + Agregar concepto
      </button>
      <div className="flex items-center justify-between border-t border-border/50 pt-3 text-sm">
        <span className="font-semibold text-foreground">Total {label}</span>
        <span className="font-bold text-foreground">{fmtMoney(total)}</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buscarConceptos, crearConceptoDesdeItem, type ConceptOption } from "@/app/backoffice/(app)/presupuestos/actions";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface Row {
  key: number;
  description: string;
  amount: string;
  currency: string;
}

interface RowProps {
  index: number;
  namePrefix: string;
  description: string;
  amount: string;
  currency: string;
  onChange: (patch: Partial<{ description: string; amount: string; currency: string }>) => void;
  onRemove?: () => void;
  onAddNext?: () => void;
}

// Una fila del presupuesto: concepto con autocompletado + área de texto multilínea adaptable + importe + moneda.
function BudgetItemRow({
  index,
  namePrefix,
  description,
  amount,
  currency,
  onChange,
  onRemove,
  onAddNext,
}: RowProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ConceptOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-ajustar altura del textarea según el contenido
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(42, textareaRef.current.scrollHeight)}px`;
    }
  }, [description]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      startTransition(async () => {
        try {
          setResults(await buscarConceptos(description));
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo buscar conceptos");
        }
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [description, open]);

  const visibleResults = open ? results : [];
  const trimmedDescription = description.trim();
  const canOfferCreate =
    open &&
    trimmedDescription.length > 0 &&
    !visibleResults.some((c) => c.name.toLowerCase() === trimmedDescription.toLowerCase());

  function pick(concept: ConceptOption) {
    onChange({
      description: concept.name,
      amount: concept.defaultAmount !== null ? String(concept.defaultAmount) : amount,
    });
    setOpen(false);
  }

  function handleCreate() {
    setCreating(true);
    startTransition(async () => {
      try {
        const created = await crearConceptoDesdeItem(trimmedDescription);
        pick(created);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el concepto");
      } finally {
        setCreating(false);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (visibleResults.length > 0) {
        pick(visibleResults[0]);
      } else if (onAddNext) {
        onAddNext();
      }
    }
  }

  return (
    <tr className="group border-b border-border/50 transition-colors hover:bg-surface/30">
      <td className="py-2.5 pl-3 pr-2 text-center text-xs font-semibold text-muted/70 align-top pt-3.5">
        {index + 1}
      </td>
      <td className="p-2 align-top">
        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            name={`${namePrefix}.description`}
            rows={1}
            value={description}
            onChange={(e) => {
              onChange({ description: e.target.value });
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre o detalle del concepto (ej. Honorarios de redacción y certificación de firmas)..."
            autoComplete="off"
            className="field w-full min-h-[42px] py-2 px-3 text-sm leading-relaxed resize-none overflow-hidden font-medium text-foreground bg-background focus:ring-2 focus:ring-accent/30"
          />
          {open && error && <p className="mt-1 text-[11px] font-semibold text-accent">{error}</p>}
          {(visibleResults.length > 0 || canOfferCreate) && (
            <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[280px] sm:min-w-[360px] rounded-xl border border-border bg-surface p-1.5 shadow-xl max-h-60 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted/70">
                Sugerencias del catálogo
              </div>
              <ul className="flex flex-col gap-0.5">
                {visibleResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(c)}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-background transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <span className="font-medium text-foreground break-words flex-1">{c.name}</span>
                      {c.defaultAmount !== null && (
                        <span className="text-xs font-semibold text-accent bg-accent-soft/30 px-2 py-0.5 rounded-md flex-none">
                          {fmtMoney(c.defaultAmount)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
                {canOfferCreate && (
                  <li className={visibleResults.length > 0 ? "mt-1 border-t border-border/50 pt-1" : ""}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleCreate}
                      disabled={creating}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-accent-soft/30 transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
                    >
                      <span>+</span>
                      <span className="truncate">
                        {creating ? "Creando concepto..." : `Crear "${trimmedDescription}" en catálogo`}
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </td>
      <td className="p-2 align-top w-36 sm:w-44">
        <div className="relative">
          <input
            name={`${namePrefix}.amount`}
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            placeholder="0.00"
            className="field w-full text-right font-medium pr-3"
          />
        </div>
      </td>
      <td className="p-2 align-top w-24 sm:w-28">
        <select
          name={`${namePrefix}.currency`}
          value={currency}
          onChange={(e) => onChange({ currency: e.target.value })}
          aria-label="Moneda del concepto"
          className="field w-full font-semibold text-center"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </td>
      <td className="py-2 pl-1 pr-3 align-top text-right w-10 pt-3.5">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar concepto"
            className="rounded-lg p-1.5 text-muted hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            title="Eliminar fila"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  );
}

export function BudgetItemsFields({
  namePrefix,
  label,
  defaultCurrency,
  initialItems,
}: {
  namePrefix: string;
  label: string;
  defaultCurrency: string;
  initialItems?: { description: string; amount: string; currency: string }[];
}) {
  const initial =
    initialItems && initialItems.length > 0
      ? initialItems
      : [{ description: "", amount: "", currency: defaultCurrency }];
  const [rows, setRows] = useState<Row[]>(initial.map((item, i) => ({ key: i, ...item })));
  const nextKeyRef = useRef(initial.length);

  function addRow() {
    setRows((prev) => [...prev, { key: nextKeyRef.current++, description: "", amount: "", currency: defaultCurrency }]);
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const totalsByCurrency = new Map<string, number>();
  for (const r of rows) {
    const n = Number(r.amount);
    if (Number.isFinite(n) && n !== 0) {
      totalsByCurrency.set(r.currency, (totalsByCurrency.get(r.currency) ?? 0) + n);
    }
  }
  const totals = [...totalsByCurrency.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-surface/30 p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent inline-block" />
          {label}
        </span>
        <span className="text-xs text-muted">
          {rows.length} {rows.length === 1 ? "concepto" : "conceptos"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border/70 text-[11px] font-bold uppercase tracking-wider text-muted">
              <th className="py-2 pl-3 pr-2 w-8 text-center">#</th>
              <th className="p-2">Concepto / Descripción</th>
              <th className="p-2 text-right w-36 sm:w-44">Importe</th>
              <th className="p-2 text-center w-24 sm:w-28">Moneda</th>
              <th className="py-2 pl-1 pr-3 w-10 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <BudgetItemRow
                key={row.key}
                index={idx}
                namePrefix={`${namePrefix}.${row.key}`}
                description={row.description}
                amount={row.amount}
                currency={row.currency}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={rows.length > 1 ? () => removeRow(row.key) : undefined}
                onAddNext={idx === rows.length - 1 ? addRow : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-accent hover:bg-accent-soft/20 transition-colors cursor-pointer w-fit shadow-xs"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar concepto
        </button>

        <div className="flex flex-col gap-1 rounded-xl bg-background border border-border/70 px-4 py-2.5 text-sm sm:min-w-[240px]">
          {totals.length === 0 ? (
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Total acumulado</span>
              <span className="font-bold text-foreground">—</span>
            </div>
          ) : (
            totals.map(([curr, total]) => (
              <div key={curr} className="flex items-center justify-between gap-4 text-xs font-semibold">
                <span className="text-muted">Total {curr}</span>
                <span className="text-sm font-bold text-foreground">
                  {curr} {fmtMoney(total)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


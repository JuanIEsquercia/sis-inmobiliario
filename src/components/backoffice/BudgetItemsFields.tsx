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
  namePrefix: string;
  description: string;
  amount: string;
  currency: string;
  onChange: (patch: Partial<{ description: string; amount: string; currency: string }>) => void;
  onRemove?: () => void;
}

// Una fila del presupuesto: concepto (con autocompletado contra el
// catálogo de BudgetConcept) + importe + moneda. Elegir una sugerencia
// precarga también el importe sugerido (no la moneda: el catálogo no
// guarda moneda) — se puede editar todo igual antes de guardar.
function BudgetItemRow({ namePrefix, description, amount, currency, onChange, onRemove }: RowProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ConceptOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Con el dropdown cerrado no hay nada que buscar — se deja de largo
    // sin tocar `results` acá; `visibleResults` más abajo es quien
    // decide qué se pinta realmente. A propósito NO exige nada tipeado:
    // hacer foco con el campo vacío ya trae el catálogo entero para
    // elegir, no hace falta escribir primero para "activar" la
    // búsqueda. El try/catch es clave: sin él, un error acá (permisos,
    // un hipo de red) rechaza la promesa en silencio y el dropdown
    // simplemente nunca aparece, sin ningún aviso — mismo criterio que
    // ClientPicker.
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
    }, 250);
    return () => clearTimeout(handle);
  }, [description, open]);

  const visibleResults = open ? results : [];
  const trimmedDescription = description.trim();
  // Solo ofrece "crear" si lo tipeado no matchea ya un concepto
  // existente al pie de la letra — evita un "Crear X" al lado de un "X"
  // ya elegible en la misma lista.
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
        {(visibleResults.length > 0 || canOfferCreate) && (
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
            {canOfferCreate && (
              <li className={visibleResults.length > 0 ? "mt-1 border-t border-border/50 pt-1" : ""}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-accent-soft/30 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {creating ? "Creando…" : `+ Crear concepto "${trimmedDescription}"`}
                </button>
              </li>
            )}
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
        className="field w-full sm:w-32"
      />
      <select
        name={`${namePrefix}.currency`}
        value={currency}
        onChange={(e) => onChange({ currency: e.target.value })}
        aria-label="Moneda del concepto"
        className="field w-full sm:w-24"
      >
        <option value="ARS">ARS</option>
        <option value="USD">USD</option>
      </select>
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
// como `${namePrefix}.${key}.description` / `.amount` / `.currency`,
// leída del lado del servidor con la misma lógica que guarantorIndices
// (ver parseItemRows en presupuestos/actions.ts). `label` distingue a
// quién pertenece esta lista cuando hay más de una en la misma página
// (Venta: Comprador y Propietario, cada una independiente).
// `defaultCurrency` es la moneda que arranca cada renglón nuevo — viene
// del selector "Moneda principal" (ver BudgetItemsSection).
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

  // Bimonetario: un total por cada moneda que aparezca entre los
  // renglones, nunca ARS + USD juntos.
  const totalsByCurrency = new Map<string, number>();
  for (const r of rows) {
    const n = Number(r.amount);
    if (Number.isFinite(n) && n !== 0) {
      totalsByCurrency.set(r.currency, (totalsByCurrency.get(r.currency) ?? 0) + n);
    }
  }
  const totals = [...totalsByCurrency.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/40 p-4 sm:p-5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
      {rows.map((row) => (
        <BudgetItemRow
          key={row.key}
          namePrefix={`${namePrefix}.${row.key}`}
          description={row.description}
          amount={row.amount}
          currency={row.currency}
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
      <div className="flex flex-col gap-0.5 border-t border-border/50 pt-3 text-sm">
        {totals.length === 0 ? (
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Total {label}</span>
            <span className="font-bold text-foreground">—</span>
          </div>
        ) : (
          totals.map(([currency, total]) => (
            <div key={currency} className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Total {label} ({currency})
              </span>
              <span className="font-bold text-foreground">
                {currency} {fmtMoney(total)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

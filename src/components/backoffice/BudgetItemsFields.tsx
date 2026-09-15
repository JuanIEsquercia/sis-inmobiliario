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
  concepts: ConceptOption[];
  loadingConcepts: boolean;
  onChange: (patch: Partial<{ description: string; amount: string; currency: string }>) => void;
  onRemove?: () => void;
  onOpenCreateModal: () => void;
}

// Una tarjeta de concepto de presupuesto de ancho completo, cómoda y con jerarquía visual clara
function BudgetItemRow({
  index,
  namePrefix,
  description,
  amount,
  currency,
  concepts,
  loadingConcepts,
  onChange,
  onRemove,
  onOpenCreateModal,
}: RowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Intentar emparejar la descripción actual con un concepto existente
  const matchedConcept = concepts.find((c) => c.name.toLowerCase() === description.trim().toLowerCase());
  const selectedValue = matchedConcept ? matchedConcept.name : description ? "__CUSTOM__" : "";

  // Auto-ajustar altura del textarea según el contenido
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(42, textareaRef.current.scrollHeight)}px`;
    }
  }, [description]);

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "__NEW__") {
      onOpenCreateModal();
      return;
    }
    if (val === "__CUSTOM__") {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }
    onChange({ description: val });
  }

  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-border/80 bg-surface/40 p-4 sm:p-5 shadow-xs hover:border-accent/40 hover:bg-surface/60 transition-all">
      {/* Cabecera del renglón */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent/15 text-xs font-bold text-accent border border-accent/20">
            #{index + 1}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Concepto del presupuesto
          </span>
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            title="Quitar concepto"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Quitar</span>
          </button>
        )}
      </div>

      {/* Área principal: Selección de concepto + Detalle + Monto/Moneda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Columna Izquierda: Selección de Catálogo y Detalle Editable */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
            <div className="flex-1 flex flex-col gap-1.5">
              <label htmlFor={`concept-select-${index}`} className="text-xs font-bold uppercase tracking-wider text-foreground">
                Selección de concepto del catálogo
              </label>
              <select
                id={`concept-select-${index}`}
                value={selectedValue}
                onChange={handleSelectChange}
                disabled={loadingConcepts}
                className="field w-full h-11 py-2 px-3.5 text-sm font-semibold text-foreground bg-background border-border shadow-xs hover:border-accent/50 focus:ring-2 focus:ring-accent/30 cursor-pointer disabled:opacity-60 rounded-xl"
              >
                <option value="">{loadingConcepts ? "Cargando catálogo..." : "— Seleccionar concepto del catálogo —"}</option>
                {concepts.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option disabled>──────────</option>
                <option value="__NEW__" className="font-bold text-accent">✨ + Agregar nuevo concepto al catálogo...</option>
                <option value="__CUSTOM__" className="font-semibold text-foreground">✏️ Concepto personalizado / Escribir libremente...</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onOpenCreateModal}
              className="h-11 px-3.5 rounded-xl border border-accent/40 bg-accent-soft/20 text-xs font-semibold text-accent hover:bg-accent-soft/40 transition-colors flex items-center justify-center gap-1.5 flex-none cursor-pointer shadow-xs"
              title="Crear un concepto nuevo e incluirlo en el catálogo"
            >
              <span>+ Nuevo en catálogo</span>
            </button>
          </div>

          {/* Detalle o aclaración adicional */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`concept-detail-${index}`} className="text-xs font-semibold text-muted">
              Detalle o aclaración específica para la impresión (opcional)
            </label>
            <textarea
              id={`concept-detail-${index}`}
              ref={textareaRef}
              name={`${namePrefix}.description`}
              rows={1}
              value={description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Ej. Honorarios por redacción de contrato (50% anticipo al firmar)..."
              className="field w-full min-h-[42px] py-2.5 px-3.5 text-sm leading-relaxed resize-none font-medium text-foreground bg-background border-border/80 focus:ring-2 focus:ring-accent/30 rounded-xl"
            />
          </div>
        </div>

        {/* Columna Derecha: Importe y Moneda */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 rounded-xl border border-border/60 bg-background/80 p-3.5">
          <div className="flex-1 flex flex-col gap-1.5">
            <label htmlFor={`concept-amount-${index}`} className="text-xs font-bold uppercase tracking-wider text-foreground">
              Importe
            </label>
            <div className="relative flex items-center w-full">
              <span className="absolute left-3 text-xs font-bold text-muted pointer-events-none select-none">
                {currency === "USD" ? "USD" : "ARS"} $
              </span>
              <input
                id={`concept-amount-${index}`}
                name={`${namePrefix}.amount`}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => onChange({ amount: e.target.value })}
                placeholder="0.00"
                className="field w-full h-11 pl-16 pr-3.5 text-right text-base font-bold text-foreground bg-surface/30 focus:bg-background rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-36 lg:w-full">
            <label htmlFor={`concept-curr-${index}`} className="text-xs font-semibold text-muted">
              Moneda
            </label>
            <select
              id={`concept-curr-${index}`}
              name={`${namePrefix}.currency`}
              value={currency}
              onChange={(e) => onChange({ currency: e.target.value })}
              aria-label="Moneda del concepto"
              className="field h-11 text-xs font-bold text-center bg-surface/30 focus:bg-background px-3 rounded-xl cursor-pointer"
            >
              <option value="ARS">ARS ($ Pesos)</option>
              <option value="USD">USD ($ Dólares)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
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

  const [concepts, setConcepts] = useState<ConceptOption[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(true);

  // Modal para agregar nuevo concepto al catálogo
  const [modalOpen, setModalOpen] = useState(false);
  const [targetRowKey, setTargetRowKey] = useState<number | null>(null);
  const [newConceptName, setNewConceptName] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [creatingConcept, setCreatingConcept] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    buscarConceptos("")
      .then((res) => {
        if (active) {
          setConcepts(res);
          setLoadingConcepts(false);
        }
      })
      .catch(() => {
        if (active) setLoadingConcepts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function addRow() {
    setRows((prev) => [...prev, { key: nextKeyRef.current++, description: "", amount: "", currency: defaultCurrency }]);
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleOpenCreateModal(rowKey: number) {
    setTargetRowKey(rowKey);
    setNewConceptName("");
    setModalError(null);
    setModalOpen(true);
  }

  function handleCreateConcept() {
    const trimmed = newConceptName.trim();
    if (!trimmed) {
      setModalError("Escribí un nombre para el concepto.");
      return;
    }

    setCreatingConcept(true);
    setModalError(null);

    startTransition(async () => {
      try {
        const created = await crearConceptoDesdeItem(trimmed);
        setConcepts((prev) => {
          if (prev.some((c) => c.id === created.id || c.name.toLowerCase() === created.name.toLowerCase())) {
            return prev;
          }
          return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
        });

        if (targetRowKey !== null) {
          updateRow(targetRowKey, { description: created.name });
        }
        setModalOpen(false);
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "No se pudo crear el concepto");
      } finally {
        setCreatingConcept(false);
      }
    });
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
    <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-surface/30 p-4 sm:p-6 shadow-xs w-full">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <span className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent inline-block" />
          {label}
        </span>
        <span className="text-xs font-semibold text-muted bg-surface px-2.5 py-1 rounded-lg border border-border/50">
          {rows.length} {rows.length === 1 ? "concepto" : "conceptos"}
        </span>
      </div>

      {/* Lista de tarjetas de renglón en lugar de tabla estrecha */}
      <div className="flex flex-col gap-4 w-full">
        {rows.map((row, idx) => (
          <BudgetItemRow
            key={row.key}
            index={idx}
            namePrefix={`${namePrefix}.${row.key}`}
            description={row.description}
            amount={row.amount}
            currency={row.currency}
            concepts={concepts}
            loadingConcepts={loadingConcepts}
            onChange={(patch) => updateRow(row.key, patch)}
            onRemove={rows.length > 1 ? () => removeRow(row.key) : undefined}
            onOpenCreateModal={() => handleOpenCreateModal(row.key)}
          />
        ))}
      </div>

      {/* Pie de sección: Botón de agregar concepto y totales por moneda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-border/40">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent-soft/20 px-4 py-2.5 text-xs font-bold text-accent hover:bg-accent-soft/40 transition-colors cursor-pointer w-full sm:w-auto shadow-xs"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar concepto al presupuesto
        </button>

        <div className="flex flex-col gap-1.5 rounded-xl bg-background border border-border/70 px-4 py-3 text-sm sm:min-w-[260px] shadow-xs">
          {totals.length === 0 ? (
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Total acumulado</span>
              <span className="font-bold text-foreground">—</span>
            </div>
          ) : (
            totals.map(([curr, total]) => (
              <div key={curr} className="flex items-center justify-between gap-4 text-xs font-bold">
                <span className="text-muted">Total {curr}</span>
                <span className="text-base font-extrabold text-foreground">
                  {curr} ${fmtMoney(total)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal para agregar un concepto nuevo al catálogo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>✨</span> Nuevo concepto para el catálogo
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:text-foreground hover:bg-surface/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-concept-name" className="text-xs font-semibold text-foreground">
                Nombre del concepto *
              </label>
              <input
                id="modal-concept-name"
                type="text"
                value={newConceptName}
                onChange={(e) => setNewConceptName(e.target.value)}
                placeholder="Ej. Honorarios de escribanía y certificación"
                autoFocus
                className="field text-sm font-medium w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateConcept();
                  }
                }}
              />
              {modalError && <p className="text-xs font-semibold text-destructive mt-1">{modalError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateConcept}
                disabled={creatingConcept || !newConceptName.trim()}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent-strong transition-colors cursor-pointer disabled:opacity-60"
              >
                {creatingConcept ? "Guardando..." : "Guardar en catálogo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

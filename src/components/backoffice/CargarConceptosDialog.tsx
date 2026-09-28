"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { guardarConceptosLiquidacion } from "@/app/backoffice/(app)/administraciones/actions";
import { SubmitButton } from "./SubmitButton";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export interface ConceptoItem {
  id: number;
  name: string;
  isSystem: boolean;
  amount: number | null;
  notes: string | null;
}

interface NuevoRow {
  key: number;
  type: "CARGO" | "DESCUENTO";
  name: string;
  amount: string;
}

interface CargarConceptosDialogProps {
  paymentId: number;
  propertyCode: string;
  address: string;
  periodLabel: string;
  currency: string;
  items: ConceptoItem[];
  managementFeePercent: number;
  /** Nombres del catálogo de conceptos, para sugerir al escribir. */
  conceptSuggestions: string[];
}

// Carga los conceptos del mes de UNA liquidación sin salir de la lista de
// Liquidaciones. Antes había que clickear la dirección, ir a la ficha,
// cargar los montos, agregar el descuento en otro formulario aparte y
// volver — el único salto de pantalla que le quedaba a este circuito,
// que ya resolvía cobrar y girar al propietario con diálogos.
//
// Todo se guarda con un solo submit (ver guardarConceptosLiquidacion):
// los montos de los conceptos fijos del contrato, los puntuales que se
// agregan acá y los que se quitan. Las filas nuevas se agregan del lado
// del cliente, sin ir al servidor hasta guardar — mismo patrón que el
// editor de conceptos de Presupuestos.
export function CargarConceptosDialog({
  paymentId,
  propertyCode,
  address,
  periodLabel,
  currency,
  items,
  managementFeePercent,
  conceptSuggestions,
}: CargarConceptosDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(guardarConceptosLiquidacion.bind(null, paymentId), null);

  // Montos de los conceptos que ya existen, por id.
  const [amounts, setAmounts] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.amount === null ? "" : String(i.amount)]))
  );
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [nuevos, setNuevos] = useState<NuevoRow[]>([]);
  const nextKey = useRef(0);

  // Al guardar bien, cerrar el diálogo: la lista de atrás ya se
  // revalidó y muestra los totales nuevos. Si falló, queda abierto con
  // el error a la vista y lo tipeado intacto.
  useEffect(() => {
    if (state?.ok) dialogRef.current?.close();
  }, [state]);

  function addRow() {
    setNuevos((prev) => [...prev, { key: nextKey.current++, type: "CARGO", name: "", amount: "" }]);
  }

  function patchRow(key: number, patch: Partial<NuevoRow>) {
    setNuevos((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Totales en vivo, con el mismo criterio que paymentBreakdown del
  // servidor: la comisión se calcula SOLO sobre el concepto de Alquiler
  // (isSystem), nunca sobre expensas ni servicios. Un descuento resta.
  const vivos = items.filter((i) => !removed.has(i.id));
  let total = 0;
  let alquiler = 0;
  for (const i of vivos) {
    const n = Number(amounts[i.id]);
    if (!Number.isFinite(n)) continue;
    total += n;
    if (i.isSystem) alquiler += n;
  }
  for (const r of nuevos) {
    const n = Number(r.amount);
    if (!Number.isFinite(n) || r.name.trim() === "") continue;
    total += r.type === "DESCUENTO" ? -Math.abs(n) : n;
  }
  const comision = alquiler * (managementFeePercent / 100);
  const neto = total - comision;

  const listaId = `conceptos-catalogo-${paymentId}`;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface cursor-pointer"
      >
        Cargar conceptos
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto z-50 w-[calc(100%-2rem)] max-w-2xl rounded-2xl border border-border/60 bg-surface p-0 text-foreground shadow-premium backdrop:bg-black/50 backdrop:backdrop-blur-xs"
      >
        <form action={formAction} className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border/60 p-6 pb-4">
            <div>
              <h3 className="text-base font-bold leading-snug text-foreground">Conceptos de la liquidación</h3>
              <p className="mt-0.5 text-xs font-medium text-muted">
                {propertyCode} — {address}
              </p>
              <p className="text-xs text-muted/80">
                Período <span className="font-semibold text-foreground/80">{periodLabel}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
              className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-surface/80 hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <datalist id={listaId}>
              {conceptSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Conceptos del contrato</p>
            <div className="flex flex-col gap-2">
              {vivos.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input type="hidden" name="itemId" value={item.id} />
                  <label
                    htmlFor={`amount-${item.id}`}
                    className="flex-1 truncate text-sm font-medium text-foreground"
                  >
                    {item.name}
                    {item.isSystem && <span className="ml-1.5 text-[10px] font-bold text-accent">(base)</span>}
                  </label>
                  <input
                    id={`amount-${item.id}`}
                    name={`amount.${item.id}`}
                    type="number"
                    step="0.01"
                    value={amounts[item.id] ?? ""}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="0.00"
                    className="field w-36 text-right"
                  />
                  {/* El de Alquiler no se puede quitar: es el concepto
                      del sistema y sobre él se calcula la comisión. */}
                  {!item.isSystem && (
                    <button
                      type="button"
                      onClick={() => setRemoved((prev) => new Set(prev).add(item.id))}
                      aria-label={`Quitar ${item.name}`}
                      title="Quitar de esta liquidación"
                      className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Los quitados viajan como hidden para que el servidor los
                borre en la misma transacción. */}
            {[...removed].map((id) => (
              <input key={id} type="hidden" name="removeItemId" value={id} />
            ))}
            {removed.size > 0 && (
              <p className="mt-2 text-[11px] font-semibold text-destructive">
                {removed.size} concepto{removed.size === 1 ? "" : "s"} se va{removed.size === 1 ? "" : "n"} a quitar al
                guardar.
              </p>
            )}

            <div className="mt-5 border-t border-border/50 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                Cargos o descuentos de este mes
              </p>
              <p className="mb-3 text-[11px] leading-relaxed text-muted/80">
                Solo para esta liquidación — un arreglo que se le cobra una vez, un descuento acordado, la mora del mes.
                No se repite en los meses siguientes.
              </p>

              {nuevos.length > 0 && (
                <div className="mb-3 flex flex-col gap-2">
                  {nuevos.map((row) => (
                    <div key={row.key} className="flex flex-wrap items-center gap-2">
                      <select
                        name={`nuevos.${row.key}.type`}
                        value={row.type}
                        onChange={(e) => patchRow(row.key, { type: e.target.value as NuevoRow["type"] })}
                        aria-label="Tipo"
                        className="field w-32 text-xs font-semibold"
                      >
                        <option value="CARGO">Cargo</option>
                        <option value="DESCUENTO">Descuento</option>
                      </select>
                      <input
                        name={`nuevos.${row.key}.name`}
                        value={row.name}
                        onChange={(e) => patchRow(row.key, { name: e.target.value })}
                        list={listaId}
                        placeholder="Concepto (ej. Mora, Arreglo de caldera)"
                        aria-label="Concepto"
                        className="field min-w-0 flex-1 text-sm"
                      />
                      <input
                        name={`nuevos.${row.key}.amount`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.amount}
                        onChange={(e) => patchRow(row.key, { amount: e.target.value })}
                        placeholder="0.00"
                        aria-label="Importe"
                        className="field w-32 text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setNuevos((prev) => prev.filter((r) => r.key !== row.key))}
                        aria-label="Quitar fila"
                        className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addRow}
                className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-accent/40 bg-accent-soft/20 px-3.5 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent-soft/40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Agregar concepto
              </button>
            </div>

            {/* Mismo desglose que ve el propietario en la liquidación,
                recalculándose mientras cargás. */}
            <div className="mt-5 flex flex-col gap-1.5 rounded-xl border border-border/60 bg-background/70 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Total liquidación</span>
                <span className="font-bold text-foreground">
                  {currency} {fmtMoney(total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Comisión ({managementFeePercent}% del alquiler)</span>
                <span className="font-semibold text-muted">
                  {currency} {fmtMoney(comision)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-1.5">
                <span className="font-semibold text-foreground">Neto al propietario</span>
                <span className="text-base font-extrabold text-accent">
                  {currency} {fmtMoney(neto)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/50 p-6 pt-4">
            {state && !state.ok && (
              <p role="status" className="mr-auto text-xs font-semibold text-destructive">
                {state.error}
              </p>
            )}
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="cursor-pointer rounded-xl border border-border/60 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface/80"
            >
              Cancelar
            </button>
            <SubmitButton
              pendingLabel="Guardando..."
              className="cursor-pointer rounded-xl bg-accent px-5 py-2 text-xs font-bold text-accent-foreground shadow-sm transition-all hover:bg-accent-strong disabled:cursor-wait disabled:opacity-60"
            >
              Guardar conceptos
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

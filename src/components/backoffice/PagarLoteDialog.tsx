"use client";

import { useRef } from "react";
import { registrarPagoLote } from "@/app/backoffice/(app)/agentes/actions";
import { DatePicker } from "./DatePicker";
import type { AgentDebtItem } from "@/lib/agentes";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

// Paga varias líneas de deuda de una — cada una queda registrada por
// separado (mismo criterio de "un pago = una línea puntual" que
// PagarDeudaDialog), solo que todas comparten fecha/medio/notas. Todas
// las líneas ya vienen filtradas a la misma moneda por quien arma esta
// selección (AgentDebtItemsTable).
export function PagarLoteDialog({
  agentId,
  items,
  currency,
  total,
}: {
  agentId: string;
  items: AgentDebtItem[];
  currency: string;
  total: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer"
      >
        Pagar seleccionadas
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto z-50 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/60 bg-surface p-0 text-foreground shadow-premium backdrop:bg-black/50 backdrop:backdrop-blur-xs"
      >
        <form
          action={registrarPagoLote.bind(null, agentId)}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-4 p-6 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground leading-snug">Pagar {items.length} líneas</h3>
              <p className="text-xs text-muted/80 mt-0.5">
                Cada una queda registrada por separado, con la misma fecha y medio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface/80 transition-colors cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-xl border border-border/50 bg-background/60 p-3 text-xs">
            {items.map((item) => (
              <li key={`${item.sourceType}-${item.sourceId}-${item.role}`} className="flex items-center justify-between gap-3">
                <span className="truncate text-foreground">
                  {item.description} · <span className="text-muted">{item.roleLabel}</span>
                </span>
                <span className="flex-none font-semibold text-foreground">{fmtMoney(item.saldo)}</span>
              </li>
            ))}
          </ul>

          {items.map((item) => (
            <input
              key={`${item.sourceType}-${item.sourceId}-${item.role}`}
              type="hidden"
              name="items"
              value={`${item.sourceType}:${item.sourceId}:${item.role}`}
            />
          ))}

          <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent-soft/30 px-4 py-3 text-sm">
            <span className="font-medium text-accent">Total a pagar</span>
            <span className="text-base font-bold text-accent">
              {currency} {fmtMoney(total)}
            </span>
          </div>

          <div className="flex flex-col gap-3.5 w-full">
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="pagar-lote-fecha" className="text-xs font-semibold text-foreground/80">
                Fecha del pago
              </label>
              <DatePicker id="pagar-lote-fecha" name="paidAt" />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="pagar-lote-method" className="text-xs font-semibold text-foreground/80">
                Medio de pago *
              </label>
              <select id="pagar-lote-method" name="method" defaultValue="TRANSFERENCIA" required className="field w-full">
                <option value="EFECTIVO" className="bg-surface text-foreground">Efectivo</option>
                <option value="TRANSFERENCIA" className="bg-surface text-foreground">Transferencia</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pagar-lote-notas" className="text-xs font-semibold text-foreground/80">
              Notas / Referencia
            </label>
            <input id="pagar-lote-notas" name="notes" className="field" placeholder="Opcional" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-border/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface/80 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-all cursor-pointer"
            >
              Confirmar Pago
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

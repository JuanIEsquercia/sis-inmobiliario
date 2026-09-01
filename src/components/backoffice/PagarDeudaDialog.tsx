"use client";

import { useRef } from "react";
import { registrarPagoDeuda } from "@/app/backoffice/(app)/agentes/actions";
import type { AgentDebtRole, AgentDebtSource } from "@/generated/prisma/client";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PagarDeudaDialogProps {
  agentId: string;
  sourceType: AgentDebtSource;
  sourceId: number;
  role: AgentDebtRole;
  sourceLabel: string;
  roleLabel: string;
  description: string;
  currency: string;
  amount: number;
  saldo: number;
}

// Imputa un pago a una línea puntual de lo devengado — un monto sin
// contexto al lado de un botón "Pagar" es fácil de tocar por error, así
// que igual que en Liquidaciones, el diálogo muestra de qué operación
// se trata antes de confirmar.
export function PagarDeudaDialog({
  agentId,
  sourceType,
  sourceId,
  role,
  sourceLabel,
  roleLabel,
  description,
  currency,
  amount,
  saldo,
}: PagarDeudaDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const montoDefault = saldo > 0 ? saldo.toFixed(2) : amount.toFixed(2);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface"
      >
        Pagar
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto z-50 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/60 bg-surface p-0 text-foreground shadow-premium backdrop:bg-black/50 backdrop:backdrop-blur-xs"
      >
        <form
          action={registrarPagoDeuda.bind(null, agentId, sourceType, sourceId, role)}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-4 p-6 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground leading-snug">
                Pagar Deuda a Agente
              </h3>
              <p className="text-xs text-muted font-medium mt-0.5">{description}</p>
              <p className="text-xs text-muted/80">
                {sourceLabel} · <span className="font-semibold text-foreground/80">{roleLabel}</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col justify-center rounded-xl border border-border/50 bg-background/60 p-3 text-sm">
              <span className="text-xs text-muted font-medium">Devengado</span>
              <span className="text-base font-bold text-foreground">
                {currency} {fmtMoney(amount)}
              </span>
            </div>
            {saldo < amount && (
              <div className="flex flex-col justify-center rounded-xl border border-accent/20 bg-accent-soft/30 p-3 text-sm">
                <span className="text-xs text-accent font-medium">Saldo pendiente</span>
                <span className="text-base font-bold text-accent">
                  {currency} {fmtMoney(saldo)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`pagar-deuda-amount-${sourceType}-${sourceId}-${role}`} className="text-xs font-semibold text-foreground/80">
                Monto a pagar ({currency}) *
              </label>
              <input
                id={`pagar-deuda-amount-${sourceType}-${sourceId}-${role}`}
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={montoDefault}
                className="field"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`pagar-deuda-fecha-${sourceType}-${sourceId}-${role}`} className="text-xs font-semibold text-foreground/80">
                Fecha del pago
              </label>
              <input
                id={`pagar-deuda-fecha-${sourceType}-${sourceId}-${role}`}
                name="paidAt"
                type="date"
                className="field"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`pagar-deuda-method-${sourceType}-${sourceId}-${role}`} className="text-xs font-semibold text-foreground/80">
              Medio de pago *
            </label>
            <select
              id={`pagar-deuda-method-${sourceType}-${sourceId}-${role}`}
              name="method"
              defaultValue="TRANSFERENCIA"
              required
              className="field"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`pagar-deuda-notas-${sourceType}-${sourceId}-${role}`} className="text-xs font-semibold text-foreground/80">
              Notas / Referencia
            </label>
            <input
              id={`pagar-deuda-notas-${sourceType}-${sourceId}-${role}`}
              name="notes"
              className="field"
              placeholder="Opcional"
            />
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

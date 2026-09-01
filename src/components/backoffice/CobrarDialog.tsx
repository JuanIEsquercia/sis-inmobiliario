"use client";

import { useRef } from "react";
import { registrarCobro } from "@/app/backoffice/(app)/administraciones/actions";
import { DatePicker } from "./DatePicker";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface CobrarDialogProps {
  paymentId: number;
  propertyCode: string;
  address: string;
  tenantName: string;
  periodLabel: string;
  currency: string;
  total: number;
  saldo: number;
}

// Reemplaza el input suelto en la tabla mensual por un diálogo con el
// mismo contexto que tendrías en la ficha completa (qué propiedad, qué
// período, cuánto se debe) antes de confirmar un cobro — un monto sin
// contexto al lado de un botón "Cobrar" es fácil de tocar por error.
export function CobrarDialog({
  paymentId,
  propertyCode,
  address,
  tenantName,
  periodLabel,
  currency,
  total,
  saldo,
}: CobrarDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const montoDefault = saldo > 0 ? saldo.toFixed(2) : total.toFixed(2);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface"
      >
        Cobrar
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto z-50 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/60 bg-surface p-0 text-foreground shadow-premium backdrop:bg-black/50 backdrop:backdrop-blur-xs"
      >
        <form
          action={registrarCobro.bind(null, paymentId)}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-4 p-6 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground leading-snug">
                Registrar Cobro
              </h3>
              <p className="text-xs text-muted font-medium mt-0.5">
                {propertyCode} — {address}
              </p>
              <p className="text-xs text-muted/80">
                {tenantName} · <span className="font-semibold text-foreground/80">{periodLabel}</span>
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
              <span className="text-xs text-muted font-medium">Total liquidación</span>
              <span className="text-base font-bold text-foreground">
                {currency} {fmtMoney(total)}
              </span>
            </div>
            {saldo < total && (
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
              <label htmlFor={`cobrar-amount-${paymentId}`} className="text-xs font-semibold text-foreground/80">
                Monto cobrado ({currency}) *
              </label>
              <input
                id={`cobrar-amount-${paymentId}`}
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={montoDefault}
                className="field"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`cobrar-fecha-${paymentId}`} className="text-xs font-semibold text-foreground/80">
                Fecha de pago
              </label>
              <DatePicker id={`cobrar-fecha-${paymentId}`} name="paidAt" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`cobrar-medio-${paymentId}`} className="text-xs font-semibold text-foreground/80">
                Medio de cobro *
              </label>
              <select
                id={`cobrar-medio-${paymentId}`}
                name="method"
                defaultValue="TRANSFERENCIA"
                required
                className="field"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia a propietario</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`cobrar-notas-${paymentId}`} className="text-xs font-semibold text-foreground/80">
                Notas / Referencia
              </label>
              <input id={`cobrar-notas-${paymentId}`} name="notes" className="field" placeholder="Opcional" />
            </div>
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            * Si el monto no cubre la totalidad, la liquidación quedará retenida en estado <span className="font-semibold text-foreground">&quot;Parcial&quot;</span> registrando la deuda restante.
          </p>

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
              Confirmar Cobro
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

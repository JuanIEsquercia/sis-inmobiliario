"use client";

import { useRef } from "react";
import { registrarCobro } from "@/app/backoffice/(app)/administraciones/actions";

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
        className="w-full max-w-sm rounded-xl border border-border bg-background p-0 text-foreground backdrop:bg-black/40"
      >
        <form
          action={registrarCobro.bind(null, paymentId)}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-3 p-5"
        >
          <div className="border-b border-border pb-3">
            <p className="text-sm font-semibold text-foreground">
              {propertyCode} — {address}
            </p>
            <p className="text-xs text-muted">
              {tenantName} · {periodLabel}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <span className="text-muted">Total liquidación</span>
            <span className="font-medium text-foreground">
              {currency} {fmtMoney(total)}
            </span>
          </div>
          {saldo < total && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Saldo pendiente</span>
              <span className="font-semibold text-accent">
                {currency} {fmtMoney(saldo)}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`cobrar-amount-${paymentId}`} className="text-xs text-muted">
              Monto cobrado ({currency})*
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
            <label htmlFor={`cobrar-fecha-${paymentId}`} className="text-xs text-muted">
              Fecha de pago
            </label>
            <input id={`cobrar-fecha-${paymentId}`} name="paidAt" type="date" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`cobrar-medio-${paymentId}`} className="text-xs text-muted">
              Medio de cobro
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
            <label htmlFor={`cobrar-notas-${paymentId}`} className="text-xs text-muted">
              Notas / Referencia
            </label>
            <input id={`cobrar-notas-${paymentId}`} name="notes" className="field" placeholder="Opcional" />
          </div>

          <p className="text-xs text-muted">
            Si el monto no llega al total, la liquidación queda &quot;Parcial&quot; con el saldo pendiente
            registrado.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-strong"
            >
              Confirmar cobro
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

"use client";

import { useRef } from "react";
import { registrarPagoPropietario } from "@/app/backoffice/(app)/administraciones/actions";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PagarPropietarioDialogProps {
  paymentId: number;
  propertyCode: string;
  address: string;
  ownerName: string;
  periodLabel: string;
  currency: string;
  netAmount: number;
}

// Mismo criterio que CobrarDialog: contexto completo (propiedad, período,
// monto neto) antes de confirmar que la inmobiliaria le entregó la plata
// al propietario — un evento aparte de que el inquilino haya pagado.
export function PagarPropietarioDialog({
  paymentId,
  propertyCode,
  address,
  ownerName,
  periodLabel,
  currency,
  netAmount,
}: PagarPropietarioDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface"
      >
        Pagar a propietario
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl border border-border bg-background p-0 text-foreground backdrop:bg-black/40"
      >
        <form
          action={registrarPagoPropietario.bind(null, paymentId)}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-3 p-5"
        >
          <div className="border-b border-border pb-3">
            <p className="text-sm font-semibold text-foreground">
              {propertyCode} — {address}
            </p>
            <p className="text-xs text-muted">
              {ownerName} · {periodLabel}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <span className="text-muted">Neto propietario</span>
            <span className="font-medium text-foreground">
              {currency} {fmtMoney(netAmount)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`pago-prop-fecha-${paymentId}`} className="text-xs text-muted">
              Fecha de pago
            </label>
            <input
              id={`pago-prop-fecha-${paymentId}`}
              name="ownerPaidAt"
              type="date"
              className="field"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`pago-prop-medio-${paymentId}`} className="text-xs text-muted">
              Medio de pago
            </label>
            <select
              id={`pago-prop-medio-${paymentId}`}
              name="method"
              defaultValue="TRANSFERENCIA"
              required
              className="field"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>

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
              Confirmar pago
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

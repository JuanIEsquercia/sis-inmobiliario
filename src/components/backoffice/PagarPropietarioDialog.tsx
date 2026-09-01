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
        className="fixed inset-0 m-auto z-50 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border/60 bg-surface p-0 text-foreground shadow-premium backdrop:bg-black/50 backdrop:backdrop-blur-xs"
      >
        <form
          action={registrarPagoPropietario.bind(null, paymentId)}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-4 p-6 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground leading-snug">
                Pagar Neto a Propietario
              </h3>
              <p className="text-xs text-muted font-medium mt-0.5">{propertyCode} — {address}</p>
              <p className="text-xs text-muted/80">
                {ownerName} · <span className="font-semibold text-foreground/80">{periodLabel}</span>
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

          <div className="flex flex-col justify-center rounded-xl border border-border/50 bg-background/60 p-4 text-sm">
            <span className="text-xs text-muted font-medium">Monto Neto a Entregar</span>
            <span className="text-lg font-bold text-accent">
              {currency} {fmtMoney(netAmount)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`pago-prop-fecha-${paymentId}`} className="text-xs font-semibold text-foreground/80">
                Fecha del pago
              </label>
              <input
                id={`pago-prop-fecha-${paymentId}`}
                name="ownerPaidAt"
                type="date"
                className="field"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`pago-prop-medio-${paymentId}`} className="text-xs font-semibold text-foreground/80">
                Medio de pago *
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

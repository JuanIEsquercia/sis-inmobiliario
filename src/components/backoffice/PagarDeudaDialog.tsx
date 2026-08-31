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
  const inputId = `pagar-${sourceType}-${sourceId}-${role}`;

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
        className="w-full max-w-sm rounded-xl border border-border bg-background p-0 text-foreground backdrop:bg-black/40"
      >
        <form
          action={registrarPagoDeuda.bind(null, agentId, sourceType, sourceId, role)}
          onSubmit={() => dialogRef.current?.close()}
          className="flex flex-col gap-3 p-5"
        >
          <div className="border-b border-border pb-3">
            <p className="text-sm font-semibold text-foreground">{description}</p>
            <p className="text-xs text-muted">
              {sourceLabel} · {roleLabel}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <span className="text-muted">Devengado</span>
            <span className="font-medium text-foreground">
              {currency} {fmtMoney(amount)}
            </span>
          </div>
          {saldo < amount && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Saldo pendiente</span>
              <span className="font-semibold text-accent">
                {currency} {fmtMoney(saldo)}
              </span>
            </div>
          )}

          <input type="hidden" name="currency" value={currency} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${inputId}-amount`} className="text-xs text-muted">
              Monto a pagar ({currency})*
            </label>
            <input
              id={`${inputId}-amount`}
              name="amount"
              type="number"
              step="0.01"
              required
              defaultValue={montoDefault}
              className="field"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${inputId}-fecha`} className="text-xs text-muted">
              Fecha de pago
            </label>
            <input id={`${inputId}-fecha`} name="paidAt" type="date" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${inputId}-notas`} className="text-xs text-muted">
              Notas
            </label>
            <input id={`${inputId}-notas`} name="notes" className="field" placeholder="Opcional" />
          </div>

          <p className="text-xs text-muted">
            Si el monto no llega al saldo, esta línea sigue con el resto pendiente para pagarlo después.
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
              Confirmar pago
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

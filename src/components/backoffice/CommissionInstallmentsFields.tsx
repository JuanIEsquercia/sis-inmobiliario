"use client";

import { useState } from "react";
import { RepartoPreview, type RepartoSchemeInfo } from "./RepartoPreview";

interface CuotaRow {
  amount: string;
  dueDate: string;
  pagareSignedBy: "" | "COMPRADOR" | "VENDEDOR";
}

const emptyCuota = (): CuotaRow => ({ amount: "", dueDate: "", pagareSignedBy: "" });

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

// De contado (default, un solo input vía RepartoPreview) vs en cuotas
// financiadas con pagaré (cronograma dinámico). El server action siempre
// termina armando el mismo cronograma (SaleCommissionInstallment) —
// "de contado" es, para el backend, una sola cuota ya cobrada hoy.
export function CommissionInstallmentsFields({ scheme }: { scheme: RepartoSchemeInfo | null }) {
  const [enCuotas, setEnCuotas] = useState(false);
  const [cuotas, setCuotas] = useState<CuotaRow[]>([emptyCuota()]);

  const total = cuotas.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const reserva = scheme ? (total * scheme.reservaPercent) / 100 : 0;
  const agenteFijo = scheme ? (total * scheme.agenteFijoPercent) / 100 : 0;
  const resto = total - reserva - agenteFijo;
  const vendedor = scheme ? (resto * scheme.vendedorPercent) / 100 : 0;
  const captador = scheme ? (resto * scheme.captadorPercent) / 100 : 0;
  const agencia = resto - vendedor - captador;

  function updateCuota(i: number, patch: Partial<CuotaRow>) {
    setCuotas((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium text-foreground">Comisión de venta</legend>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="enCuotas" checked={enCuotas} onChange={(e) => setEnCuotas(e.target.checked)} />
        Se financia en cuotas (con firma de pagaré)
      </label>

      {!enCuotas && <RepartoPreview name="commissionAmount" label="Comisión" scheme={scheme} />}

      {enCuotas && (
        <div className="flex flex-col gap-3">
          {cuotas.map((cuota, i) => (
            <div
              key={i}
              className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`installments.${i}.amount`} className="text-xs text-muted">
                  Cuota {i + 1} de {cuotas.length} — Monto*
                </label>
                <input
                  id={`installments.${i}.amount`}
                  name={`installments.${i}.amount`}
                  type="number"
                  step="0.01"
                  required
                  value={cuota.amount}
                  onChange={(e) => updateCuota(i, { amount: e.target.value })}
                  className="field"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`installments.${i}.dueDate`} className="text-xs text-muted">
                  Vence*
                </label>
                <input
                  id={`installments.${i}.dueDate`}
                  name={`installments.${i}.dueDate`}
                  type="date"
                  required
                  value={cuota.dueDate}
                  onChange={(e) => updateCuota(i, { dueDate: e.target.value })}
                  className="field"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`installments.${i}.pagareSignedBy`} className="text-xs text-muted">
                  Pagaré firmado por
                </label>
                <select
                  id={`installments.${i}.pagareSignedBy`}
                  name={`installments.${i}.pagareSignedBy`}
                  value={cuota.pagareSignedBy}
                  onChange={(e) => updateCuota(i, { pagareSignedBy: e.target.value as CuotaRow["pagareSignedBy"] })}
                  className="field"
                >
                  <option value="">Sin pagaré</option>
                  <option value="COMPRADOR">Comprador</option>
                  <option value="VENDEDOR">Vendedor</option>
                </select>
              </div>
              {cuotas.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCuotas((prev) => prev.filter((_, idx) => idx !== i))}
                  className="w-fit text-xs text-muted hover:text-accent hover:underline"
                >
                  Quitar cuota
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCuotas((prev) => [...prev, emptyCuota()])}
            className="w-fit text-sm text-accent hover:underline"
          >
            + Agregar cuota
          </button>

          {total > 0 && (
            <dl className="mt-1 flex flex-col gap-1 rounded-lg border border-border bg-surface/40 p-3 text-xs">
              <div className="flex items-center justify-between font-medium">
                <dt className="text-foreground">Comisión total ({cuotas.length} cuotas)</dt>
                <dd className="text-foreground">{fmt(total)}</dd>
              </div>
              {scheme ? (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Fondo de reserva ({scheme.reservaPercent}%)</dt>
                    <dd className="text-foreground">{fmt(reserva)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">
                      {scheme.agenteFijoNombre} ({scheme.agenteFijoPercent}%)
                    </dt>
                    <dd className="text-foreground">{fmt(agenteFijo)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Vendedor ({scheme.vendedorPercent}% del resto)</dt>
                    <dd className="text-foreground">{fmt(vendedor)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Captador ({scheme.captadorPercent}% del resto)</dt>
                    <dd className="text-foreground">{fmt(captador)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-1 font-medium">
                    <dt className="text-foreground">Inmobiliaria</dt>
                    <dd className="text-foreground">{fmt(agencia)}</dd>
                  </div>
                </>
              ) : (
                <p className="text-muted">Sin esquema configurado todavía — se guarda el total sin repartir.</p>
              )}
            </dl>
          )}
        </div>
      )}
    </fieldset>
  );
}

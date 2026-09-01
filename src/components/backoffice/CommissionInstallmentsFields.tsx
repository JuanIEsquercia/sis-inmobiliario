"use client";

import { useState } from "react";
import type { RepartoSchemeInfo } from "./RepartoPreview";
import { CuotaRowFields, emptyCuotaRow, type CuotaRowValue } from "./CuotaRowFields";

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const VENTA_PARTIES = [
  { value: "COMPRADOR", label: "Comprador" },
  { value: "VENDEDOR", label: "Vendedor" },
];

// La comisión total SIEMPRE se carga una sola vez, directo, acá arriba
// — nunca sale de sumar cuotas. Si se activa "en cuotas", esas filas son
// el cronograma de cobro de ESE total ya fijo: tienen que sumarlo exacto
// (se valida server-side en validarSumaCuotas; acá solo se avisa antes
// de mandar el formulario). "De contado" (cuotas destildado) es, para
// el backend, un cronograma de una sola cuota que además se da por
// cobrada ahora mismo — por eso pide medio de cobro.
export function CommissionInstallmentsFields({ scheme }: { scheme: RepartoSchemeInfo | null }) {
  const [total, setTotal] = useState(0);
  const [enCuotas, setEnCuotas] = useState(false);
  const [cuotas, setCuotas] = useState<CuotaRowValue[]>([emptyCuotaRow()]);

  const reserva = scheme ? (total * scheme.reservaPercent) / 100 : 0;
  const agenteFijo = scheme ? (total * scheme.agenteFijoPercent) / 100 : 0;
  const resto = total - reserva - agenteFijo;
  const vendedor = scheme ? (resto * scheme.vendedorPercent) / 100 : 0;
  const captador = scheme ? (resto * scheme.captadorPercent) / 100 : 0;
  const agencia = resto - vendedor - captador;

  const sumaCuotas = cuotas.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const cuadra = Math.abs(sumaCuotas - total) < 0.01;

  function updateCuota(i: number, patch: Partial<CuotaRowValue>) {
    setCuotas((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium text-foreground">Comisión de venta</legend>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="commissionAmount" className="text-xs text-muted">
          Comisión total*
        </label>
        <input
          id="commissionAmount"
          name="commissionAmount"
          type="number"
          step="0.01"
          required
          className="field"
          onChange={(e) => setTotal(Number(e.target.value) || 0)}
        />
      </div>

      {total > 0 && (
        <dl className="flex flex-col gap-1 rounded-lg border border-border bg-surface/40 p-3 text-xs">
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

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="enCuotas" checked={enCuotas} onChange={(e) => setEnCuotas(e.target.checked)} />
        Se cobra en cuotas
      </label>

      {!enCuotas && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="method" className="text-xs text-muted">
            Medio de cobro (de contado — se da por cobrada ahora)*
          </label>
          <select id="method" name="method" defaultValue="TRANSFERENCIA" required className="field">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
      )}

      {enCuotas && (
        <div className="flex flex-col gap-3">
          {cuotas.map((cuota, i) => (
            <CuotaRowFields
              key={i}
              index={i}
              total={cuotas.length}
              value={cuota}
              parties={VENTA_PARTIES}
              onChange={(patch) => updateCuota(i, patch)}
              onRemove={cuotas.length > 1 ? () => setCuotas((prev) => prev.filter((_, idx) => idx !== i)) : undefined}
            />
          ))}
          <button
            type="button"
            onClick={() => setCuotas((prev) => [...prev, emptyCuotaRow()])}
            className="w-fit text-sm text-accent hover:underline"
          >
            + Agregar cuota
          </button>

          <p className={`text-xs ${cuadra ? "text-muted" : "font-semibold text-foreground"}`}>
            Cuotas: {fmt(sumaCuotas)} de {fmt(total)}
            {!cuadra && " — tiene que coincidir con la comisión total de arriba"}
          </p>
        </div>
      )}
    </fieldset>
  );
}

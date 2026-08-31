"use client";

import { useState } from "react";

export interface RepartoSchemeInfo {
  reservaPercent: number;
  agenteFijoPercent: number;
  agenteFijoNombre: string;
  vendedorPercent: number;
  captadorPercent: number;
}

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

// Input de comisión + desglose en vivo del reparto configurado en Caja
// › Esquema. Es solo una previsualización — el cálculo que efectivamente
// se guarda se hace server-side con Decimal en crearVenta/crearComisionAlquiler.
// El monto SIEMPRE se puede cargar, exista o no todavía un esquema —
// `scheme` en null solo apaga el desglose, nunca el input.
export function RepartoPreview({
  scheme,
  name = "commissionAmount",
  label = "Comisión*",
}: {
  scheme: RepartoSchemeInfo | null;
  name?: string;
  label?: string;
}) {
  const [amount, setAmount] = useState(0);

  const reserva = scheme ? (amount * scheme.reservaPercent) / 100 : 0;
  const agenteFijo = scheme ? (amount * scheme.agenteFijoPercent) / 100 : 0;
  const resto = amount - reserva - agenteFijo;
  const vendedor = scheme ? (resto * scheme.vendedorPercent) / 100 : 0;
  const captador = scheme ? (resto * scheme.captadorPercent) / 100 : 0;
  const agencia = resto - vendedor - captador;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        step="0.01"
        required
        className="field"
        onChange={(e) => setAmount(Number(e.target.value) || 0)}
      />

      {!scheme && amount > 0 && (
        <p className="text-xs text-muted">
          Sin esquema configurado todavía — se guarda el monto completo, sin repartir.
        </p>
      )}

      {scheme && amount > 0 && (
        <dl className="mt-1 flex flex-col gap-1 rounded-lg border border-border bg-surface/40 p-3 text-xs">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Fondo de reserva ({scheme.reservaPercent}%)</dt>
            <dd className="text-foreground">{fmt(reserva)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">{scheme.agenteFijoNombre} ({scheme.agenteFijoPercent}%)</dt>
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
        </dl>
      )}
    </div>
  );
}

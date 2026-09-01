"use client";

import { useState } from "react";
import { CuotaRowFields, emptyCuotaRow, type CuotaRowValue } from "./CuotaRowFields";

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const ALQUILER_PARTIES = [
  { value: "INQUILINO", label: "Inquilino" },
  { value: "PROPIETARIO", label: "Propietario" },
];

// Define el cronograma de cobro de una comisión de alquiler YA cargada
// — mismo esquema de registro que Ventas (ver CommissionInstallmentsFields
// y el modelo CommissionInstallment), pero acá el total no se vuelve a
// pedir: ya quedó fijo al cargar la comisión (RentalCommission.amount),
// así que solo se muestra de referencia.
export function AlquilerCronogramaFields({ totalAmount, currency }: { totalAmount: number; currency: string }) {
  const [enCuotas, setEnCuotas] = useState(false);
  const [cuotas, setCuotas] = useState<CuotaRowValue[]>([emptyCuotaRow()]);

  const sumaCuotas = cuotas.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const cuadra = Math.abs(sumaCuotas - totalAmount) < 0.01;

  function updateCuota(i: number, patch: Partial<CuotaRowValue>) {
    setCuotas((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Comisión a cobrar:{" "}
        <span className="font-medium text-foreground">
          {currency} {fmt(totalAmount)}
        </span>
      </p>

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
              parties={ALQUILER_PARTIES}
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
            Cuotas: {fmt(sumaCuotas)} de {fmt(totalAmount)}
            {!cuadra && " — tiene que coincidir con la comisión de arriba"}
          </p>
        </div>
      )}
    </div>
  );
}

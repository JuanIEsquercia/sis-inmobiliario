"use client";

import { DatePicker } from "./DatePicker";

export interface CuotaRowValue {
  amount: string;
  dueDate: string;
  attributedTo: string;
  pagareFirmado: boolean;
  yaCobrada: boolean;
  method: "EFECTIVO" | "TRANSFERENCIA";
}

export interface PartyOption {
  value: string;
  label: string;
}

// Una fila del cronograma de cobro — mismo esquema de registro para
// Venta y Alquiler (ver comentario en el modelo CommissionInstallment).
// Lo único que cambia entre las dos es la lista de "atribuida a"
// (Comprador/Vendedor vs. Inquilino/Propietario), que decide quien
// renderiza esto.
export function CuotaRowFields({
  index,
  total,
  value,
  parties,
  onChange,
  onRemove,
}: {
  index: number;
  total: number;
  value: CuotaRowValue;
  parties: PartyOption[];
  onChange: (patch: Partial<CuotaRowValue>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`installments.${index}.amount`} className="text-xs text-muted">
            Cuota {index + 1} de {total} — Monto*
          </label>
          <input
            id={`installments.${index}.amount`}
            name={`installments.${index}.amount`}
            type="number"
            step="0.01"
            required
            value={value.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            className="field"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`installments.${index}.dueDate`} className="text-xs text-muted">
            Vence*
          </label>
          <DatePicker
            id={`installments.${index}.dueDate`}
            name={`installments.${index}.dueDate`}
            required
            value={value.dueDate}
            onChange={(v) => onChange({ dueDate: v })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`installments.${index}.attributedTo`} className="text-xs text-muted">
            Atribuida a
          </label>
          <select
            id={`installments.${index}.attributedTo`}
            name={`installments.${index}.attributedTo`}
            value={value.attributedTo}
            onChange={(e) => onChange({ attributedTo: e.target.value })}
            className="field"
          >
            <option value="">Sin especificar</option>
            {parties.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            name={`installments.${index}.pagareFirmado`}
            checked={value.pagareFirmado}
            onChange={(e) => onChange({ pagareFirmado: e.target.checked })}
          />
          Pagaré firmado
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            name={`installments.${index}.yaCobrada`}
            checked={value.yaCobrada}
            onChange={(e) => onChange({ yaCobrada: e.target.checked })}
          />
          Ya se cobró
        </label>
        {value.yaCobrada && (
          <select
            name={`installments.${index}.method`}
            value={value.method}
            onChange={(e) => onChange({ method: e.target.value as CuotaRowValue["method"] })}
            className="field py-1 text-xs"
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto text-xs text-muted hover:text-accent hover:underline"
          >
            Quitar cuota
          </button>
        )}
      </div>
    </div>
  );
}

export const emptyCuotaRow = (): CuotaRowValue => ({
  amount: "",
  dueDate: "",
  attributedTo: "",
  pagareFirmado: false,
  yaCobrada: false,
  method: "TRANSFERENCIA",
});

"use client";

import { useState } from "react";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

// Se carga el % de actualización, no el monto nuevo — el servidor
// calcula el monto resultante (ver aplicarIndexacion). Este preview es
// solo para que quien carga vea de una si el % que tipeó tiene sentido,
// antes de mandar el formulario.
export function IndexacionPercentField({
  currentAmount,
  currency,
  idPrefix = "",
  compact = false,
  ariaLabel,
}: {
  currentAmount: number;
  currency: string;
  idPrefix?: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState("");
  const pct = Number(value);
  const newAmount = value.trim() !== "" && Number.isFinite(pct) ? currentAmount * (1 + pct / 100) : null;

  const input = (
    <input
      id={compact ? undefined : `${idPrefix}percentage`}
      name="percentage"
      type="number"
      step="0.01"
      required
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className={compact ? "field w-24 py-1 text-xs" : "field w-28"}
      placeholder="% ej. 10"
      aria-label={ariaLabel}
    />
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5">
        {input}
        {newAmount !== null && (
          <span className="text-[9px] text-muted whitespace-nowrap">
            → {currency} {fmtMoney(newAmount)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${idPrefix}percentage`} className="text-xs text-muted">
        % de actualización
      </label>
      {input}
      {newAmount !== null && (
        <span className="text-[10px] text-muted">
          {currency} {fmtMoney(currentAmount)} → {currency} {fmtMoney(newAmount)}
        </span>
      )}
    </div>
  );
}

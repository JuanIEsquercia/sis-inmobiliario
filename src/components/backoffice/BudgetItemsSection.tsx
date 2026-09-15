"use client";

import { useState } from "react";
import { BudgetItemsFields } from "@/components/backoffice/BudgetItemsFields";

interface ItemInit {
  description: string;
  amount: string;
  currency: string;
}

export function BudgetItemsSection({
  type,
  initialCurrency,
  alquilerItems,
  compradorItems,
  propietarioItems,
}: {
  type: "ALQUILER" | "VENTA";
  initialCurrency: string;
  alquilerItems?: ItemInit[];
  compradorItems?: ItemInit[];
  propietarioItems?: ItemInit[];
}) {
  const [currency, setCurrency] = useState(initialCurrency);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface/20 p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="currency" className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent inline-block" />
            Moneda principal predeterminada
          </label>
          <p className="text-xs text-muted">
            Moneda sugerida al agregar nuevos conceptos. Podés cambiar la moneda individual de cada ítem en su tarjeta.
          </p>
        </div>
        <select
          id="currency"
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="field w-36 font-bold text-center flex-none"
        >
          <option value="ARS">ARS ($)</option>
          <option value="USD">USD (US$)</option>
        </select>
      </div>

      {type === "ALQUILER" ? (
        <BudgetItemsFields
          namePrefix="items"
          label="Conceptos — Inquilino"
          defaultCurrency={currency}
          initialItems={alquilerItems}
        />
      ) : (
        <div className="flex flex-col gap-8 w-full">
          <BudgetItemsFields
            namePrefix="itemsComprador"
            label="Conceptos — Comprador"
            defaultCurrency={currency}
            initialItems={compradorItems}
          />
          <BudgetItemsFields
            namePrefix="itemsPropietario"
            label="Conceptos — Propietario"
            defaultCurrency={currency}
            initialItems={propietarioItems}
          />
        </div>
      )}
    </div>
  );
}

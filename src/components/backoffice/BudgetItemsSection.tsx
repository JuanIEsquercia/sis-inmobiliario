"use client";

import { useState } from "react";
import { BudgetItemsFields } from "@/components/backoffice/BudgetItemsFields";

interface ItemInit {
  description: string;
  amount: string;
  currency: string;
}

// Junta el selector "Moneda principal" con las listas de conceptos —
// tiene que ser un solo client component para que cambiar la moneda
// principal se refleje en el default de cada renglón nuevo (incluidas
// las dos listas de una Venta). El <select name="currency"> sigue
// enviándose para guardar Budget.currency (la moneda que se
// preselecciona); cada BudgetItem lleva la suya propia igual.
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 w-56">
        <label htmlFor="currency" className="text-xs text-muted">
          Moneda principal
        </label>
        <select
          id="currency"
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="field"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
        <p className="text-[11px] text-muted/80">
          Se preselecciona en cada concepto nuevo. Cada concepto se puede pasar a la otra moneda por su cuenta.
        </p>
      </div>

      {type === "ALQUILER" ? (
        <BudgetItemsFields
          namePrefix="items"
          label="Conceptos — Inquilino"
          defaultCurrency={currency}
          initialItems={alquilerItems}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

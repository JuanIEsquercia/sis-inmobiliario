"use client";

import { useState } from "react";

// Arranca abierto solo mientras sigue "a confirmar" (todavía es una
// decisión pendiente) — apenas se contesta Sí/No, colapsa a solo
// lectura con un "Editar" para no dejar un formulario abierto de algo
// que ya se resolvió.
export function EditableRenovacionCard({
  defaultValue,
  canEdit,
  action,
}: {
  defaultValue: boolean | null;
  canEdit: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(defaultValue === null);

  const label = defaultValue === true ? "Sí" : defaultValue === false ? "No" : "A confirmar";

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-foreground font-semibold">{label}</p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-fit text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            Editar
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        setEditing(false);
        return action(formData);
      }}
      className="flex flex-col gap-3"
    >
      <select
        name="renewalCommissionExpected"
        defaultValue={defaultValue === true ? "true" : defaultValue === false ? "false" : ""}
        className="field w-full text-xs py-1.5"
      >
        <option value="">A confirmar</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
      <button
        type="submit"
        className="w-full rounded-lg border border-border bg-surface py-2 text-xs font-bold uppercase tracking-wider hover:bg-surface/10 hover:text-foreground cursor-pointer shadow-xs transition-colors"
      >
        Guardar
      </button>
      <p className="text-[10px] text-muted leading-relaxed">
        Solo &quot;Sí&quot; entra a la proyección financiera, estimado como un mes de alquiler al monto vigente, en
        el mes de vencimiento de este contrato.
      </p>
    </form>
  );
}

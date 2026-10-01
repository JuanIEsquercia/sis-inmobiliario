"use client";

import { useState } from "react";
import { FormWithFeedback } from "./FormWithFeedback";
import { IndexTypeSelect } from "./IndexTypeSelect";
import type { ActionResult } from "@/app/backoffice/(app)/usuarios/actions";

interface IndexTypeOption {
  id: number;
  code: string;
}

interface Props {
  frequencyMonths: number | null;
  indexTypeId: number | null;
  indexTypeCode: string | null;
  /** Ya formateada, tal como se muestra en la ficha. */
  nextDueLabel: string | null;
  indexTypes: IndexTypeOption[];
  /** Solo ADMIN. El servidor lo vuelve a validar. */
  canEdit: boolean;
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}

// Esquema de actualización del contrato, con corrección para ADMIN.
//
// Arranca SIEMPRE colapsado, a diferencia de EditableRenovacionCard, que
// se abre cuando falta decidir algo. Acá no falta nada: el dato ya está
// cargado y esto es para arreglarlo cuando se cargó mal o se
// renegoció. Dejar el formulario abierto invitaría a tocarlo, y es
// justamente lo que no queremos.
export function EditableActualizacionCard({
  frequencyMonths,
  indexTypeId,
  indexTypeCode,
  nextDueLabel,
  indexTypes,
  canEdit,
  action,
}: Props) {
  const [editing, setEditing] = useState(false);

  const resumen = frequencyMonths
    ? `Cada ${frequencyMonths} meses${indexTypeCode ? ` (${indexTypeCode})` : ""}`
    : "No aplica";

  if (!editing) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-foreground font-medium">{resumen}</p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-fit text-[11px] font-semibold text-accent hover:underline cursor-pointer"
          >
            Corregir
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-3">
      <FormWithFeedback
        action={action}
        submitLabel="Guardar corrección"
        pendingLabel="Guardando..."
        className="flex flex-col gap-3"
        submitClassName="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-background cursor-pointer disabled:opacity-60 disabled:cursor-wait"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="indexationFrequencyMonths" className="text-xs text-muted">
            Actualiza cada (meses)
          </label>
          <input
            id="indexationFrequencyMonths"
            name="indexationFrequencyMonths"
            type="number"
            min={1}
            max={60}
            defaultValue={frequencyMonths ?? ""}
            className="field text-xs py-1.5"
            placeholder="3"
          />
          <p className="text-[10px] text-muted leading-relaxed">
            Dejalo vacío si este contrato no se actualiza por índice.
          </p>
        </div>

        <IndexTypeSelect initialIndexTypes={indexTypes} defaultValue={indexTypeId} />

        <p className="text-[10px] text-muted leading-relaxed border-t border-border/40 pt-2">
          La próxima fecha se recalcula sola, manteniendo el cronograma original del contrato
          {nextDueLabel ? ` (hoy cae el ${nextDueLabel})` : ""}. No cambia el monto del alquiler ni las
          liquidaciones ya emitidas.
        </p>
      </FormWithFeedback>

      <button
        type="button"
        onClick={() => setEditing(false)}
        className="w-fit text-[11px] font-semibold text-muted hover:underline cursor-pointer"
      >
        Cancelar
      </button>
    </div>
  );
}

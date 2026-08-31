"use client";

import { useState } from "react";
import { IndexTypeSelect } from "./IndexTypeSelect";
import { ConceptsChecklist } from "./ConceptsChecklist";

interface IndexTypeOption {
  id: number;
  code: string;
}

interface ConceptOption {
  id: number;
  name: string;
}

// Todo lo que solo aplica si administramos el contrato (comisión,
// indexación, transferencias, conceptos recurrentes) — se muestra u
// oculta con el tilde "Administramos este contrato". Si se destilda,
// el contrato queda solo como el registro del alquiler cerrado, sin
// cronograma de liquidaciones.
export function AdministracionFields({
  defaultChecked,
  defaultManagementFeePercent,
  defaultIndexationFrequencyMonths,
  indexTypes,
  extraConcepts,
  defaultCheckedConceptIds,
  defaultPaymentAlias,
  defaultPaymentCBU,
}: {
  defaultChecked: boolean;
  defaultManagementFeePercent?: string;
  defaultIndexationFrequencyMonths?: number;
  indexTypes: IndexTypeOption[];
  extraConcepts: ConceptOption[];
  defaultCheckedConceptIds: number[];
  defaultPaymentAlias?: string;
  defaultPaymentCBU?: string;
}) {
  const [administered, setAdministered] = useState(defaultChecked);

  return (
    <>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isAdministered"
          checked={administered}
          onChange={(e) => setAdministered(e.target.checked)}
        />
        Administramos este contrato
      </label>

      {administered && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="managementFeePercent" className="text-xs text-muted">
                Comisión administración (%)*
              </label>
              <input
                id="managementFeePercent"
                name="managementFeePercent"
                type="number"
                step="0.01"
                min={0}
                max={100}
                required
                defaultValue={defaultManagementFeePercent}
                className="field"
                placeholder="8"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="indexationFrequencyMonths" className="text-xs text-muted">
                Actualiza cada (meses)
              </label>
              <input
                id="indexationFrequencyMonths"
                name="indexationFrequencyMonths"
                type="number"
                defaultValue={defaultIndexationFrequencyMonths}
                className="field"
                placeholder="3"
              />
            </div>
            <IndexTypeSelect initialIndexTypes={indexTypes} />
          </div>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
              Transferencias <span className="font-normal text-muted">(para el agente que hace la liquidación)</span>
            </legend>
            <input name="paymentAlias" placeholder="Alias" defaultValue={defaultPaymentAlias ?? ""} className="field" />
            <input name="paymentCBU" placeholder="CBU" defaultValue={defaultPaymentCBU ?? ""} className="field" />
          </fieldset>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Conceptos recurrentes <span className="font-normal text-muted">(el monto se carga mes a mes en cada liquidación)</span>
            </p>
            <ConceptsChecklist initialConcepts={extraConcepts} defaultCheckedIds={defaultCheckedConceptIds} />
          </div>
        </>
      )}
    </>
  );
}

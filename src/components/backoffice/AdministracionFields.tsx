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

// Todo lo que solo aplica si administramos el contrato (indexación,
// transferencias, conceptos recurrentes) — se muestra u oculta con el
// tilde "Administramos este contrato". Si se destilda, el contrato
// queda solo como el registro de la colocación, sin cronograma de
// liquidaciones — igual que ComisionAlquilerFields, que arranca
// destildado por default: administrar es la excepción, no la regla, la
// mayoría de las cargas son solo la comisión de colocación.
export function AdministracionFields({
  defaultChecked,
  defaultManagementFeePercent,
  defaultIndexationFrequencyMonths,
  indexTypes,
  extraConcepts,
  defaultCheckedConceptIds,
  defaultPaymentAlias,
  defaultPaymentCBU,
  defaultPaymentDueDay,
  defaultTenantPaysCommission,
  defaultCommissionAlias,
  defaultCommissionCBU,
  defaultRenewalCommissionExpected,
}: {
  defaultChecked: boolean;
  defaultManagementFeePercent?: string;
  defaultIndexationFrequencyMonths?: number;
  indexTypes: IndexTypeOption[];
  extraConcepts: ConceptOption[];
  defaultCheckedConceptIds: number[];
  defaultPaymentAlias?: string;
  defaultPaymentCBU?: string;
  defaultPaymentDueDay?: number;
  defaultTenantPaysCommission?: boolean;
  defaultCommissionAlias?: string;
  defaultCommissionCBU?: string;
  defaultRenewalCommissionExpected?: boolean | null;
}) {
  const [administered, setAdministered] = useState(defaultChecked);
  const [tenantPaysCommission, setTenantPaysCommission] = useState(defaultTenantPaysCommission ?? false);

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
            <div className="flex flex-col gap-1.5">
              <label htmlFor="paymentDueDay" className="text-xs text-muted">
                Día de vencimiento del alquiler
              </label>
              <input
                id="paymentDueDay"
                name="paymentDueDay"
                type="number"
                min={1}
                max={31}
                defaultValue={defaultPaymentDueDay}
                className="field"
                placeholder="10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="renewalCommissionExpected" className="text-xs text-muted">
                ¿Se cobra comisión en la renovación?
              </label>
              <select
                id="renewalCommissionExpected"
                name="renewalCommissionExpected"
                defaultValue={
                  defaultRenewalCommissionExpected === true
                    ? "true"
                    : defaultRenewalCommissionExpected === false
                      ? "false"
                      : ""
                }
                className="field"
              >
                <option value="">A confirmar</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
              Transferencias <span className="font-normal text-muted">(para el agente que hace la liquidación)</span>
            </legend>
            <input name="paymentAlias" placeholder="Alias (alquiler, propietario)" defaultValue={defaultPaymentAlias ?? ""} className="field" />
            <input name="paymentCBU" placeholder="CBU (alquiler, propietario)" defaultValue={defaultPaymentCBU ?? ""} className="field" />
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium text-foreground">Comisión de administración</legend>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="tenantPaysCommission"
                checked={tenantPaysCommission}
                onChange={(e) => setTenantPaysCommission(e.target.checked)}
              />
              El inquilino transfiere la comisión directo a la inmobiliaria (aparte de lo que le paga al propietario)
            </label>
            {tenantPaysCommission && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  name="commissionAlias"
                  placeholder="Alias (inmobiliaria)"
                  defaultValue={defaultCommissionAlias ?? ""}
                  className="field"
                />
                <input
                  name="commissionCBU"
                  placeholder="CBU (inmobiliaria)"
                  defaultValue={defaultCommissionCBU ?? ""}
                  className="field"
                />
              </div>
            )}
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

import { requirePermission } from "@/lib/auth";
import { getConcepts, getIndexTypes } from "@/lib/alquileres";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { GuarantorFields } from "@/components/backoffice/GuarantorFields";
import { ConceptsChecklist } from "@/components/backoffice/ConceptsChecklist";
import { IndexTypeSelect } from "@/components/backoffice/IndexTypeSelect";
import { createContract } from "../actions";

export default async function NuevoContratoPage() {
  await requirePermission("administraciones.crear");
  const [concepts, indexTypes] = await Promise.all([getConcepts(), getIndexTypes()]);
  const extraConcepts = concepts.filter((c) => !c.isSystem);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Nuevo contrato</h1>

      <form action={createContract} className="flex flex-col gap-6">
        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Unidad</legend>
          <input name="propertyCode" placeholder="Código de propiedad (Adinco)*" required className="field" />
          <input name="unitAddress" placeholder="Dirección*" required className="field sm:col-span-2" />
          <input name="unitCity" placeholder="Ciudad" className="field" />
          <select name="unitPropertyType" defaultValue="" className="field">
            <option value="">Tipo</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Propietario</legend>
          <input name="ownerFirstName" placeholder="Nombre*" required className="field" />
          <input name="ownerLastName" placeholder="Apellido*" required className="field" />
          <input name="ownerDoc" placeholder="DNI" className="field" />
          <input name="ownerPhone" placeholder="Teléfono" className="field" />
          <input name="ownerEmail" type="email" placeholder="Email" className="field" />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Inquilino</legend>
          <input name="tenantFirstName" placeholder="Nombre*" required className="field" />
          <input name="tenantLastName" placeholder="Apellido*" required className="field" />
          <input name="tenantDoc" placeholder="DNI*" required className="field" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tenantBirthDate" className="text-xs text-muted">
              Fecha de nacimiento
            </label>
            <input id="tenantBirthDate" name="tenantBirthDate" type="date" className="field" />
          </div>
          <input name="tenantPhone" placeholder="Teléfono" className="field" />
          <input name="tenantEmail" type="email" placeholder="Email" className="field" />
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Garante(s)</p>
          <GuarantorFields />
        </div>

        <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Contrato</legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-xs text-muted">
              Fecha de inicio*
            </label>
            <input id="startDate" name="startDate" type="date" required className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="durationMonths" className="text-xs text-muted">
              Duración (meses)*
            </label>
            <input id="durationMonths" name="durationMonths" type="number" min={1} required className="field" placeholder="12" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rentAmount" className="text-xs text-muted">
              Monto mensual*
            </label>
            <input id="rentAmount" name="rentAmount" type="number" step="0.01" required className="field" />
          </div>
          <select name="currency" defaultValue="ARS" className="field">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
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
              className="field"
              placeholder="8"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="indexationFrequencyMonths" className="text-xs text-muted">
              Actualiza cada (meses)
            </label>
            <input id="indexationFrequencyMonths" name="indexationFrequencyMonths" type="number" className="field" placeholder="3" />
          </div>
          <IndexTypeSelect initialIndexTypes={indexTypes} />
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Conceptos recurrentes <span className="font-normal text-muted">(el monto se carga mes a mes en cada liquidación)</span>
          </p>
          <ConceptsChecklist initialConcepts={extraConcepts} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas
          </label>
          <textarea id="notes" name="notes" rows={3} className="field" />
        </div>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
            Documentos <span className="font-normal text-muted">(opcional, en PDF — también se pueden subir después)</span>
          </legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contratoFile" className="text-xs text-muted">
              Contrato
            </label>
            <input id="contratoFile" name="contratoFile" type="file" accept="application/pdf" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dniInquilinoFile" className="text-xs text-muted">
              DNI inquilino
            </label>
            <input id="dniInquilinoFile" name="dniInquilinoFile" type="file" accept="application/pdf" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dniGaranteFile" className="text-xs text-muted">
              DNI garante
            </label>
            <input id="dniGaranteFile" name="dniGaranteFile" type="file" accept="application/pdf" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="otroFile" className="text-xs text-muted">
              Otro
            </label>
            <input id="otroFile" name="otroFile" type="file" accept="application/pdf" className="field" />
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
        >
          Crear contrato
        </button>
      </form>
    </div>
  );
}

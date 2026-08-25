import { requirePermission } from "@/lib/auth";
import { getConcepts, getContractById, getIndexTypes } from "@/lib/alquileres";
import { GuarantorFields } from "@/components/backoffice/GuarantorFields";
import { ConceptsChecklist } from "@/components/backoffice/ConceptsChecklist";
import { IndexTypeSelect } from "@/components/backoffice/IndexTypeSelect";
import { ClientPicker } from "@/components/backoffice/ClientPicker";
import { UnitPicker } from "@/components/backoffice/UnitPicker";
import { createContract } from "../actions";

interface PageProps {
  searchParams: Promise<{ renovarDe?: string }>;
}

export default async function NuevoContratoPage({ searchParams }: PageProps) {
  await requirePermission("administraciones.crear");
  const { renovarDe } = await searchParams;
  const [concepts, indexTypes] = await Promise.all([getConcepts(), getIndexTypes()]);
  const extraConcepts = concepts.filter((c) => !c.isSystem);

  const sourceContractId = renovarDe ? Number(renovarDe) : null;
  const sourceContract =
    sourceContractId && Number.isFinite(sourceContractId) ? await getContractById(sourceContractId) : null;

  return (
    <div className="max-w-2xl">
      <h1 className={sourceContract ? "mb-1 text-xl font-semibold text-foreground" : "mb-6 text-xl font-semibold text-foreground"}>
        {sourceContract ? "Renovar contrato" : "Nuevo contrato"}
      </h1>
      {sourceContract && (
        <p className="mb-6 text-sm text-muted">
          A partir del contrato de {sourceContract.unit.address} — unidad, propietario, inquilino y garantes vienen
          precargados; cargá los términos nuevos (fechas, monto, duración).
        </p>
      )}

      <form action={createContract} className="flex flex-col gap-6">
        {sourceContractId && <input type="hidden" name="renewedFromContractId" value={sourceContractId} />}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Unidad</legend>
          <UnitPicker initialSelected={sourceContract ? sourceContract.unit : null} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Propietario</legend>
          <ClientPicker namePrefix="owner" roleLabel="Propietario" initialSelected={sourceContract?.owner ?? null} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Inquilino</legend>
          <ClientPicker
            namePrefix="tenant"
            roleLabel="Inquilino"
            includeBirthDate
            initialSelected={sourceContract?.tenant ?? null}
          />
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Garante(s)</p>
          <GuarantorFields initialGuarantors={sourceContract?.guarantors.map((g) => g.client) ?? []} />
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
          <select name="currency" defaultValue={sourceContract?.currency ?? "ARS"} className="field">
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
              defaultValue={sourceContract?.managementFeePercent.toString()}
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
              defaultValue={sourceContract?.indexationFrequencyMonths ?? undefined}
              className="field"
              placeholder="3"
            />
          </div>
          <IndexTypeSelect initialIndexTypes={indexTypes} />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
            Transferencias <span className="font-normal text-muted">(para el agente que hace la liquidación)</span>
          </legend>
          <input
            name="paymentAlias"
            placeholder="Alias"
            defaultValue={sourceContract?.paymentAlias ?? ""}
            className="field"
          />
          <input name="paymentCBU" placeholder="CBU" defaultValue={sourceContract?.paymentCBU ?? ""} className="field" />
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Conceptos recurrentes <span className="font-normal text-muted">(el monto se carga mes a mes en cada liquidación)</span>
          </p>
          <ConceptsChecklist
            initialConcepts={extraConcepts}
            defaultCheckedIds={sourceContract?.concepts.filter((c) => !c.concept.isSystem).map((c) => c.concept.id) ?? []}
          />
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
          {sourceContract ? "Crear contrato renovado" : "Crear contrato"}
        </button>
      </form>
    </div>
  );
}

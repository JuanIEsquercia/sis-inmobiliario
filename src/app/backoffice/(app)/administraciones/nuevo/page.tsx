import { requirePermission, getContractGroupScope } from "@/lib/auth";
import { getConcepts, getContractById, getIndexTypes } from "@/lib/alquileres";
import { getAgents, getActiveCommissionScheme, toRepartoSchemeInfo } from "@/lib/caja";
import { GuarantorFields } from "@/components/backoffice/GuarantorFields";
import { ClientPicker } from "@/components/backoffice/ClientPicker";
import { UnitPicker } from "@/components/backoffice/UnitPicker";
import { AdministracionFields } from "@/components/backoffice/AdministracionFields";
import { ComisionAlquilerFields } from "@/components/backoffice/ComisionAlquilerFields";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { DatePicker } from "@/components/backoffice/DatePicker";
import { createContract } from "../actions";

interface PageProps {
  searchParams: Promise<{ renovarDe?: string }>;
}

export default async function NuevoContratoPage({ searchParams }: PageProps) {
  const profile = await requirePermission("administraciones.crear");
  const scope = await getContractGroupScope(profile);
  const { renovarDe } = await searchParams;
  const sourceContractId = renovarDe ? Number(renovarDe) : null;

  const [concepts, indexTypes, agents, sourceContract] = await Promise.all([
    getConcepts(),
    getIndexTypes(),
    getAgents(),
    sourceContractId && Number.isFinite(sourceContractId) ? getContractById(sourceContractId, scope) : null,
  ]);
  const extraConcepts = concepts.filter((c) => !c.isSystem);

  // Colocar un inquilino nuevo y renovarle el contrato a uno que ya
  // estaba son unidades de negocio distintas para la comisión — cada
  // una con su propio esquema de reparto (ver Caja > Esquema).
  const isRenewal = !!sourceContract;
  const commissionScheme = await getActiveCommissionScheme(isRenewal ? "RENOVACION" : "ALQUILER");

  return (
    <div className="max-w-6xl w-full mx-auto">
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
        {/* Ligado a sourceContract (ya cargado y validado contra el scope
            del usuario), no a sourceContractId crudo — si el contrato
            pedido en ?renovarDe= no existe o no es visible para quien
            está creando, esto queda vacío y el alta no se marca como
            renovación de nada. */}
        {sourceContract && <input type="hidden" name="renewedFromContractId" value={sourceContract.id} />}

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
          <ClientPicker namePrefix="tenant" roleLabel="Inquilino" initialSelected={sourceContract?.tenant ?? null} />
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
            <DatePicker id="startDate" name="startDate" required />
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
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
            Agentes <span className="font-normal text-muted">(quién colocó este alquiler — necesario para la liquidación al personal)</span>
          </legend>
          <AgentSelect
            agents={agents}
            name="vendedorAgentId"
            label="Agente vendedor"
            required={false}
            // A propósito sin default a quien está cargando el contrato:
            // asumir que quien lo carga es siempre el vendedor generó un
            // cruce real cuando el que carga también es el propietario de
            // la propiedad — se elige a mano en cada alta.
            defaultValue={sourceContract?.vendedorAgentId ?? undefined}
          />
          <AgentSelect
            agents={agents}
            name="captadorAgentId"
            label="Agente captador"
            required={false}
            defaultValue={sourceContract?.captadorAgentId ?? undefined}
          />
        </fieldset>

        {profile.permissions.includes("caja.comisiones.crear") && (
          <ComisionAlquilerFields
            scheme={commissionScheme && toRepartoSchemeInfo(commissionScheme)}
            isRenewal={isRenewal}
          />
        )}

        {/* Administración al final a propósito — es la excepción, no la
            regla: la mayoría de las cargas son solo la comisión de
            colocación de arriba, sin gestión continua del alquiler. */}
        <AdministracionFields
          defaultChecked={sourceContract ? sourceContract.isAdministered : false}
          defaultManagementFeePercent={sourceContract?.managementFeePercent?.toString()}
          defaultIndexationFrequencyMonths={sourceContract?.indexationFrequencyMonths ?? undefined}
          indexTypes={indexTypes}
          extraConcepts={extraConcepts}
          defaultCheckedConceptIds={
            sourceContract?.concepts.filter((c) => !c.concept.isSystem).map((c) => c.concept.id) ?? []
          }
          defaultPaymentAlias={sourceContract?.paymentAlias ?? ""}
          defaultPaymentCBU={sourceContract?.paymentCBU ?? ""}
          defaultPaymentDueDay={sourceContract?.paymentDueDay}
          defaultTenantPaysCommission={sourceContract?.tenantPaysCommission ?? false}
          defaultCommissionAlias={sourceContract?.commissionAlias ?? ""}
          defaultCommissionCBU={sourceContract?.commissionCBU ?? ""}
          defaultRenewalCommissionExpected={sourceContract?.renewalCommissionExpected}
        />

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
              DNI INQUILINO + INGRESOS + INFORME BCRA UNIFICADOS
            </label>
            <input id="dniInquilinoFile" name="dniInquilinoFile" type="file" accept="application/pdf" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dniGaranteFile" className="text-xs text-muted">
              DNI GARANTE + INGRESOS + INFORME BCRA UNIFICADOS
            </label>
            <input id="dniGaranteFile" name="dniGaranteFile" type="file" accept="application/pdf" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="otroFile" className="text-xs text-muted">
              DOCUMENTACIÓN RESPALDATORIA EXTRA
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

import { requirePermission } from "@/lib/auth";
import { getAgents, getActiveCommissionScheme, toRepartoSchemeInfo } from "@/lib/caja";
import { UnitPicker } from "@/components/backoffice/UnitPicker";
import { ClientPicker } from "@/components/backoffice/ClientPicker";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { CommissionInstallmentsFields } from "@/components/backoffice/CommissionInstallmentsFields";
import { crearVenta, buscarUnidadesCaja, buscarClientesCaja } from "../../actions";

export default async function NuevaVentaPage() {
  const profile = await requirePermission("caja.ventas.crear");
  const [agents, scheme] = await Promise.all([getAgents(), getActiveCommissionScheme("VENTA")]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Nueva venta</h1>

      <form action={crearVenta} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Propiedad</legend>
          <UnitPicker search={buscarUnidadesCaja} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Parte vendedora</legend>
          <ClientPicker namePrefix="seller" roleLabel="Parte vendedora" search={buscarClientesCaja} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Comprador</legend>
          <ClientPicker namePrefix="buyer" roleLabel="Comprador" search={buscarClientesCaja} />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Precio</legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="initialPriceAmount" className="text-xs text-muted">
              Precio de inicio
            </label>
            <input id="initialPriceAmount" name="initialPriceAmount" type="number" step="0.01" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="saleAmount" className="text-xs text-muted">
              Precio de cierre
            </label>
            <input id="saleAmount" name="saleAmount" type="number" step="0.01" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="currency" className="text-xs text-muted">
              Moneda
            </label>
            <select id="currency" name="currency" defaultValue="ARS" className="field">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="closedAt" className="text-xs text-muted">
              Fecha de cierre*
            </label>
            <input id="closedAt" name="closedAt" type="date" required className="field" />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
            Agentes de la inmobiliaria
          </legend>
          <AgentSelect
            agents={agents}
            defaultValue={profile.id}
            name="vendedorAgentId"
            label="Agente vendedor"
            required={false}
          />
          <AgentSelect agents={agents} name="captadorAgentId" label="Agente captador" required={false} />
        </fieldset>

        <CommissionInstallmentsFields scheme={scheme && toRepartoSchemeInfo(scheme)} />

        {!scheme && (
          <p className="text-xs text-muted">
            Todavía no hay un esquema de comisiones de Venta configurado — esta venta se va a guardar sin repartir.{" "}
            <a href="/backoffice/agentes/esquema" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Configurarlo en Pagos a agentes › Esquema
            </a>
            .
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas
          </label>
          <textarea id="notes" name="notes" rows={3} className="field" />
        </div>

        <button
          type="submit"
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
        >
          Crear venta
        </button>
      </form>
    </div>
  );
}

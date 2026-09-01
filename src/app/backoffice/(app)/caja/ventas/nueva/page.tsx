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
    <div className="max-w-5xl w-full mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva Venta</h1>
          <p className="text-xs text-muted mt-1">Registra una nueva operación de venta realizada por la inmobiliaria.</p>
        </div>
      </div>

      <form action={crearVenta} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <fieldset className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Propiedad & Partes</legend>
            <div className="flex flex-col gap-4">
              <UnitPicker search={buscarUnidadesCaja} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <ClientPicker namePrefix="seller" roleLabel="Parte vendedora" search={buscarClientesCaja} />
                <ClientPicker namePrefix="buyer" roleLabel="Comprador" search={buscarClientesCaja} />
              </div>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Valores & Fechas</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="initialPriceAmount" className="text-xs font-semibold text-foreground/80">
                  Precio de inicio
                </label>
                <input id="initialPriceAmount" name="initialPriceAmount" type="number" step="0.01" className="field" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="saleAmount" className="text-xs font-semibold text-foreground/80">
                  Precio de cierre
                </label>
                <input id="saleAmount" name="saleAmount" type="number" step="0.01" className="field" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currency" className="text-xs font-semibold text-foreground/80">
                  Moneda *
                </label>
                <select id="currency" name="currency" defaultValue="ARS" className="field">
                  <option value="ARS">ARS ($)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="closedAt" className="text-xs font-semibold text-foreground/80">
                  Fecha de cierre *
                </label>
                <input id="closedAt" name="closedAt" type="date" required className="field" />
              </div>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Agentes de la Inmobiliaria</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AgentSelect
                agents={agents}
                defaultValue={profile.id}
                name="vendedorAgentId"
                label="Agente vendedor"
                required={false}
              />
              <AgentSelect agents={agents} name="captadorAgentId" label="Agente captador" required={false} />
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Cobro de Comisión</h2>
            <CommissionInstallmentsFields scheme={scheme && toRepartoSchemeInfo(scheme)} />

            {!scheme && (
              <p className="text-xs text-muted leading-relaxed">
                Todavía no hay un esquema de comisiones de Venta configurado. La venta se guardará sin repartir.{" "}
                <a href="/backoffice/agentes/esquema" target="_blank" rel="noreferrer" className="text-accent font-semibold hover:underline">
                  Configurar esquema ›
                </a>
              </p>
            )}

            <div className="flex flex-col gap-1.5 pt-2">
              <label htmlFor="notes" className="text-xs font-semibold text-foreground/80">
                Notas / Observaciones
              </label>
              <textarea id="notes" name="notes" rows={3} className="field" placeholder="Detalles de la operación..." />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-accent py-3 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-all cursor-pointer"
            >
              Crear Venta
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

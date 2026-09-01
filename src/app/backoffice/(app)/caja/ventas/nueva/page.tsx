import { requirePermission } from "@/lib/auth";
import { getAgents, getActiveCommissionScheme, toRepartoSchemeInfo } from "@/lib/caja";
import { UnitPicker } from "@/components/backoffice/UnitPicker";
import { ClientPicker } from "@/components/backoffice/ClientPicker";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { CommissionInstallmentsFields } from "@/components/backoffice/CommissionInstallmentsFields";
import { DatePicker } from "@/components/backoffice/DatePicker";
import { crearVenta, buscarUnidadesCaja, buscarClientesCaja } from "../../actions";

export default async function NuevaVentaPage() {
  const profile = await requirePermission("caja.ventas.crear");
  const [agents, scheme] = await Promise.all([getAgents(), getActiveCommissionScheme("VENTA")]);

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Nueva Venta</h1>
          <p className="text-xs font-medium text-muted mt-1">Registrá una nueva operación de venta realizada por la inmobiliaria.</p>
        </div>
      </div>

      <form action={crearVenta} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Principal (8 cols en LG) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <fieldset className="flex flex-col gap-5 rounded-3xl border border-border/70 bg-surface p-6 sm:p-7 shadow-sm">
            <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-muted">Propiedad & Partes</legend>
            <div className="flex flex-col gap-5 w-full">
              <UnitPicker search={buscarUnidadesCaja} />
              
              <div className="flex flex-col gap-5 w-full pt-1">
                <ClientPicker namePrefix="seller" roleLabel="Parte vendedora" search={buscarClientesCaja} />
                <ClientPicker namePrefix="buyer" roleLabel="Comprador" search={buscarClientesCaja} />
              </div>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-5 rounded-3xl border border-border/70 bg-surface p-6 sm:p-7 shadow-sm">
            <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-muted">Valores & Fechas</legend>
            <div className="flex flex-col gap-4.5 w-full">
              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="initialPriceAmount" className="text-xs font-semibold text-foreground/80">
                  Precio de inicio
                </label>
                <input id="initialPriceAmount" name="initialPriceAmount" type="number" step="0.01" className="field w-full" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="saleAmount" className="text-xs font-semibold text-foreground/80">
                  Precio de cierre *
                </label>
                <input id="saleAmount" name="saleAmount" type="number" step="0.01" required className="field w-full" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="currency" className="text-xs font-semibold text-foreground/80">
                  Moneda *
                </label>
                <select id="currency" name="currency" defaultValue="ARS" className="field w-full">
                  <option value="ARS" className="bg-surface text-foreground">ARS ($)</option>
                  <option value="USD" className="bg-surface text-foreground">USD ($)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="closedAt" className="text-xs font-semibold text-foreground/80">
                  Fecha de cierre *
                </label>
                <DatePicker id="closedAt" name="closedAt" required />
              </div>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-5 rounded-3xl border border-border/70 bg-surface p-6 sm:p-7 shadow-sm">
            <legend className="px-2 text-xs font-extrabold uppercase tracking-wider text-muted">Agentes de la Inmobiliaria</legend>
            <div className="flex flex-col gap-4.5 w-full">
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

        {/* Columna Lateral de Comisión y Cobro (4 cols en LG) */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-border/70 bg-surface p-6 sm:p-7 shadow-premium flex flex-col gap-5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted">Cobro de Comisión</h2>
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
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-accent to-accent-strong py-3.5 text-sm font-bold text-accent-foreground shadow-md shadow-accent/20 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              Crear Venta
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

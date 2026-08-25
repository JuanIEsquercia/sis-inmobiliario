import { requirePermission } from "@/lib/auth";
import { getAgents } from "@/lib/caja";
import { UnitPicker } from "@/components/backoffice/UnitPicker";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { crearVenta, buscarUnidadesCaja } from "../../actions";

export default async function NuevaVentaPage() {
  const profile = await requirePermission("caja.ventas.crear");
  const agents = await getAgents();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Nueva venta</h1>

      <form action={crearVenta} className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Propiedad</legend>
          <UnitPicker search={buscarUnidadesCaja} />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Operación</legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="saleAmount" className="text-xs text-muted">
              Precio de venta
            </label>
            <input id="saleAmount" name="saleAmount" type="number" step="0.01" className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="commissionAmount" className="text-xs text-muted">
              Comisión*
            </label>
            <input id="commissionAmount" name="commissionAmount" type="number" step="0.01" required className="field" />
          </div>
          <select name="currency" defaultValue="ARS" className="field">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="closedAt" className="text-xs text-muted">
              Fecha de cierre*
            </label>
            <input id="closedAt" name="closedAt" type="date" required className="field" />
          </div>
          <AgentSelect agents={agents} defaultValue={profile.id} />
        </fieldset>

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

import { requirePermission } from "@/lib/auth";
import { getAgents } from "@/lib/caja";
import { UnitPicker } from "@/components/backoffice/UnitPicker";
import { AppraisalSplitFields } from "@/components/backoffice/AppraisalSplitFields";
import { YaCobradaFields } from "@/components/backoffice/YaCobradaFields";
import { DatePicker } from "@/components/backoffice/DatePicker";
import { crearTasacion, buscarUnidadesCaja } from "../../actions";

export default async function NuevaTasacionPage() {
  await requirePermission("caja.tasaciones.crear");
  const agents = await getAgents();

  return (
    <div className="max-w-5xl w-full mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva Tasación</h1>
          <p className="text-xs text-muted mt-1">Registra la tasación de un inmueble realizada por la inmobiliaria.</p>
        </div>
      </div>

      <form action={crearTasacion} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <fieldset className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Propiedad</legend>
            <UnitPicker search={buscarUnidadesCaja} />
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Datos de la Tasación</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="amount" className="text-xs font-semibold text-foreground/80">
                  Monto Honorarios *
                </label>
                <div className="flex gap-2">
                  <input id="amount" name="amount" type="number" step="0.01" required className="field flex-1" placeholder="0.00" />
                  <select name="currency" defaultValue="ARS" className="field w-24">
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="completedAt" className="text-xs font-semibold text-foreground/80">
                  Fecha *
                </label>
                <DatePicker id="completedAt" name="completedAt" required />
              </div>
            </div>
          </fieldset>

          <AppraisalSplitFields agents={agents} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Cobro & Notas</h2>
            <YaCobradaFields />

            <div className="flex flex-col gap-1.5 pt-2">
              <label htmlFor="notes" className="text-xs font-semibold text-foreground/80">
                Notas / Observaciones
              </label>
              <textarea id="notes" name="notes" rows={4} className="field" placeholder="Opcional..." />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-accent py-3 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-all cursor-pointer"
            >
              Crear Tasación
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

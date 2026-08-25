import { requirePermission } from "@/lib/auth";
import { createContract } from "../actions";

export default async function NuevoContratoPage() {
  await requirePermission("alquileres.crear");
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Nuevo contrato</h1>

      <form action={createContract} className="flex flex-col gap-6">
        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Unidad</legend>
          <input name="unitAddress" placeholder="Dirección*" required className="field sm:col-span-2" />
          <input name="unitCity" placeholder="Ciudad" className="field" />
          <input name="unitPropertyType" placeholder="Tipo (Departamento, Casa...)" className="field" />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Propietario</legend>
          <input name="ownerName" placeholder="Nombre*" required className="field" />
          <input name="ownerPhone" placeholder="Teléfono" className="field" />
          <input name="ownerEmail" type="email" placeholder="Email" className="field" />
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Inquilino</legend>
          <input name="tenantName" placeholder="Nombre*" required className="field" />
          <input name="tenantPhone" placeholder="Teléfono" className="field" />
          <input name="tenantEmail" type="email" placeholder="Email" className="field" />
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Contrato</legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-xs text-muted">
              Fecha de inicio*
            </label>
            <input id="startDate" name="startDate" type="date" required className="field" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endDate" className="text-xs text-muted">
              Fecha de fin*
            </label>
            <input id="endDate" name="endDate" type="date" required className="field" />
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
            <label htmlFor="indexationFrequencyMonths" className="text-xs text-muted">
              Actualiza cada (meses)
            </label>
            <input id="indexationFrequencyMonths" name="indexationFrequencyMonths" type="number" className="field" />
          </div>
          <input name="indexationType" placeholder="Índice (ICL, IPC...)" className="field" />
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
          Crear contrato
        </button>
      </form>
    </div>
  );
}

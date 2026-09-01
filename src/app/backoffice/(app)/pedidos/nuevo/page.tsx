import { requirePermission } from "@/lib/auth";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { createPedido } from "../actions";

export default async function NuevoPedidoPage() {
  await requirePermission("pedidos.crear");
  return (
    <div className="max-w-5xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuevo Pedido de Demanda</h1>
        <p className="text-xs text-muted mt-1">Registra un pedido o búsqueda específica de un cliente que busca propiedad.</p>
      </div>

      <form action={createPedido} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Datos del Cliente</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input name="clienteNombre" placeholder="Nombre completo *" required className="field sm:col-span-1" />
              <input name="clienteTelefono" placeholder="Teléfono de contacto" className="field" />
              <input name="clienteEmail" type="email" placeholder="Email de contacto" className="field" />
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Preferencias de Búsqueda</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/80">Operación *</label>
                <select name="operationType" defaultValue="Alquiler" className="field">
                  <option value="Alquiler">Alquiler</option>
                  <option value="Venta">Venta</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/80">Tipo Propiedad</label>
                <select name="propertyType" defaultValue="" className="field">
                  <option value="">Cualquiera</option>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/80">Zona / Barrio</label>
                <input name="zona" placeholder="Ej. Centro, Recoleta..." className="field" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/80">Precio Mínimo</label>
                <input name="precioMin" type="number" placeholder="0" className="field" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/80">Precio Máximo</label>
                <input name="precioMax" type="number" placeholder="Sin límite" className="field" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground/80">Moneda</label>
                <select name="moneda" defaultValue="ARS" className="field">
                  <option value="ARS">ARS ($)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Requisitos & Notas</h2>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ambientesMin" className="text-xs font-semibold text-foreground/80">
                Ambientes Mínimos
              </label>
              <input id="ambientesMin" name="ambientesMin" type="number" placeholder="1, 2, 3..." className="field" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notas" className="text-xs font-semibold text-foreground/80">
                Notas adicionales
              </label>
              <textarea id="notas" name="notas" rows={4} className="field" placeholder="Cualquier detalle extra del pedido..." />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-accent py-3 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-all cursor-pointer"
            >
              Guardar Pedido
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

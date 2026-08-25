import { createPedido } from "../actions";

export default function NuevoPedidoPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Nuevo pedido</h1>

      <form action={createPedido} className="flex flex-col gap-5">
        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Cliente</legend>
          <input name="clienteNombre" placeholder="Nombre*" required className="field sm:col-span-1" />
          <input name="clienteTelefono" placeholder="Teléfono" className="field" />
          <input name="clienteEmail" type="email" placeholder="Email" className="field" />
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">Qué busca</legend>
          <select name="operationType" defaultValue="Alquiler" className="field">
            <option value="Alquiler">Alquiler</option>
            <option value="Venta">Venta</option>
          </select>
          <input name="propertyType" placeholder="Tipo (Departamento, Casa...)" className="field" />
          <input name="zona" placeholder="Zona / barrio" className="field" />
          <input name="precioMin" type="number" placeholder="Precio mín." className="field" />
          <input name="precioMax" type="number" placeholder="Precio máx." className="field" />
          <select name="moneda" defaultValue="ARS" className="field">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
          <input name="ambientesMin" type="number" placeholder="Ambientes mín." className="field" />
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notas" className="text-sm font-medium text-foreground">
            Notas
          </label>
          <textarea id="notas" name="notas" rows={4} className="field" />
        </div>

        <button
          type="submit"
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
        >
          Guardar pedido
        </button>
      </form>
    </div>
  );
}

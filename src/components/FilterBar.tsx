import { operationLabel } from "@/lib/format";

interface FilterBarProps {
  action: string;
  cities: string[];
  propertyTypes: string[];
  defaults: {
    operacion?: string;
    tipo?: string;
    ciudad?: string;
    precioMin?: string;
    precioMax?: string;
    ambientes?: string;
  };
}

export function FilterBar({ action, cities, propertyTypes, defaults }: FilterBarProps) {
  return (
    <form
      method="get"
      action={action}
      className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <select name="operacion" defaultValue={defaults.operacion ?? ""} className="field">
        <option value="">Operación</option>
        <option value="For Sale">{operationLabel("For Sale")}</option>
        <option value="For Rent">{operationLabel("For Rent")}</option>
      </select>

      <select name="tipo" defaultValue={defaults.tipo ?? ""} className="field">
        <option value="">Tipo</option>
        {propertyTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select name="ciudad" defaultValue={defaults.ciudad ?? ""} className="field">
        <option value="">Ciudad</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      <input
        type="number"
        name="precioMin"
        placeholder="Precio mín."
        defaultValue={defaults.precioMin ?? ""}
        className="field"
      />
      <input
        type="number"
        name="precioMax"
        placeholder="Precio máx."
        defaultValue={defaults.precioMax ?? ""}
        className="field"
      />
      <input
        type="number"
        name="ambientes"
        placeholder="Ambientes mín."
        defaultValue={defaults.ambientes ?? ""}
        className="field"
      />

      <button
        type="submit"
        className="col-span-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong sm:col-span-1 lg:col-span-6"
      >
        Buscar
      </button>
    </form>
  );
}

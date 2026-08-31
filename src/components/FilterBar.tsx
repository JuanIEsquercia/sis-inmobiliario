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
    aptoCredito?: string;
  };
}

export function FilterBar({ action, cities, propertyTypes, defaults }: FilterBarProps) {
  return (
    <form
      method="get"
      action={action}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-border/60 bg-surface p-6 shadow-premium sm:grid-cols-2 lg:grid-cols-8 items-end"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Operación</label>
        <select name="operacion" defaultValue={defaults.operacion ?? ""} className="field w-full cursor-pointer">
          <option value="">Cualquiera</option>
          <option value="For Sale">{operationLabel("For Sale")}</option>
          <option value="For Rent">{operationLabel("For Rent")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Tipo</label>
        <select name="tipo" defaultValue={defaults.tipo ?? ""} className="field w-full cursor-pointer">
          <option value="">Cualquiera</option>
          {propertyTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Ciudad</label>
        <select name="ciudad" defaultValue={defaults.ciudad ?? ""} className="field w-full cursor-pointer">
          <option value="">Cualquiera</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Precio Mín</label>
        <input
          type="number"
          name="precioMin"
          placeholder="Mín. USD / AR$"
          defaultValue={defaults.precioMin ?? ""}
          className="field w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Precio Máx</label>
        <input
          type="number"
          name="precioMax"
          placeholder="Máx. USD / AR$"
          defaultValue={defaults.precioMax ?? ""}
          className="field w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Ambientes</label>
        <input
          type="number"
          name="ambientes"
          placeholder="Cantidad mín."
          defaultValue={defaults.ambientes ?? ""}
          className="field w-full"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted px-1">Financiación</label>
        <label className="field flex w-full cursor-pointer items-center gap-2 text-foreground">
          <input
            type="checkbox"
            name="aptoCredito"
            value="true"
            defaultChecked={defaults.aptoCredito === "true"}
            className="h-4 w-4 cursor-pointer accent-accent"
          />
          Apto crédito
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-strong hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-accent/10"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="opacity-90"
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="m21 21-4.3-4.3" />
        </svg>
        <span>Buscar</span>
      </button>
    </form>
  );
}


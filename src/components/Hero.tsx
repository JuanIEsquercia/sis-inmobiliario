import { FilterBar } from "@/components/FilterBar";

interface HeroProps {
  cities: string[];
  propertyTypes: string[];
}

export function Hero({ cities, propertyTypes }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 100% at 15% 0%, var(--accent-soft) 0%, transparent 55%), radial-gradient(90% 90% at 100% 0%, var(--accent-soft) 0%, transparent 45%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-20 sm:pb-28">
        <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-accent">
          García Propiedades
        </span>
        <h1 className="mb-4 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Encontrá tu próxima propiedad en Corrientes
        </h1>
        <p className="mb-10 max-w-xl text-base text-muted sm:text-lg">
          Casas, departamentos, campos y terrenos en venta y alquiler — con el respaldo de una inmobiliaria de
          confianza hace años en la ciudad.
        </p>

        <FilterBar action="/propiedades" cities={cities} propertyTypes={propertyTypes} defaults={{}} />
      </div>
    </section>
  );
}

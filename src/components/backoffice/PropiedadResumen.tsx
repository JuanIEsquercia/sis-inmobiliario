import { formatArea, formatPrice, operationLabel } from "@/lib/format";
import { AGUA_A_CARGO_DE, A_CARGO_DE } from "@/lib/property-features";

// Vista de solo lectura de la ficha completa (las secciones del
// formulario de Adinco). Se usa en las fichas que vienen de Adinco, que
// se siguen editando allá hasta el corte.

type Ficha = { [campo: string]: unknown; videos?: { url: string }[] };

const txt = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v ? "Sí" : null;
  return String(v);
};

function Bloque({ titulo, filas }: { titulo: string; filas: [string, string | null][] }) {
  const visibles = filas.filter(([, v]) => v);
  if (visibles.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {visibles.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Lista({ titulo, items }: { titulo: string; items: unknown }) {
  const lista = Array.isArray(items) ? (items as string[]) : [];
  if (lista.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{titulo}</h3>
      <div className="flex flex-wrap gap-1.5">
        {lista.map((i) => (
          <span key={i} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground">{i}</span>
        ))}
      </div>
    </div>
  );
}

const etiqueta = (opciones: { value: string; label: string }[], v: unknown) =>
  opciones.find((o) => o.value === v)?.label ?? null;

export function PropiedadResumen({ p }: { p: Ficha }) {
  const precio = formatPrice({
    priceAmount: p.priceAmount,
    priceCurrency: (p.priceCurrency as string | null) ?? null,
    priceRaw: (p.priceRaw as string | null) ?? null,
  });
  const esAlquiler = p.operationType === "For Rent";
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border p-4">
      <p className="font-medium text-foreground">{txt(p.contentTitle) ?? txt(p.title)}</p>
      <Bloque
        titulo="Datos básicos"
        filas={[
          ["Operación", operationLabel(String(p.operationType))],
          ["Tipo", txt(p.propertyType)],
          ["Edificación", txt(p.propertySubtype)],
          ["Precio", precio + (p.hidePrice ? " (no se publica)" : "")],
          ["Expensas", p.expenses ? `ARS ${Number(p.expenses).toLocaleString("es-AR")}${p.expensesApproximate ? " aprox." : ""}` : null],
          ["Apto crédito", p.aptoCredito === null || p.aptoCredito === undefined ? null : p.aptoCredito ? "Sí" : "No"],
          ["Apto profesional", txt(p.aptoProfesional)],
          ["Acepta mascotas", txt(p.aceptaMascotas)],
          ["Ocupada", txt(p.ocupada)],
          ["Depósito (meses)", esAlquiler ? txt(p.depositMonths) : null],
          ["Impuestos a cargo de", esAlquiler ? etiqueta(A_CARGO_DE, p.taxesPaidBy) : null],
          ["Agua a cargo de", esAlquiler ? etiqueta(AGUA_A_CARGO_DE, p.waterPaidBy) : null],
        ]}
      />
      <Bloque
        titulo="Ubicación"
        filas={[
          ["Dirección", txt(p.address)],
          ["Piso / depto.", [p.addressFloor, p.addressApartment].filter(Boolean).join(" ") || null],
          ["Barrio", txt(p.neighborhood)],
          ["Localidad", txt(p.city)],
          ["Provincia", txt(p.region)],
          ["Entre calles", [p.betweenStreet1, p.betweenStreet2].filter(Boolean).join(" y ") || null],
          ["Cerca de", txt(p.nearStreet)],
          ["Barrio cerrado", txt(p.gatedCommunity)],
          ["Dirección en el sitio", p.showExactAddress === false ? "Aproximada" : null],
        ]}
      />
      <Bloque
        titulo="Características"
        filas={[
          ["Sup. total", formatArea(p.plotArea)],
          ["Sup. cubierta", formatArea(p.floorArea)],
          ["Sup. descubierta", formatArea(p.uncoveredArea)],
          ["Fondo libre", formatArea(p.backyardArea)],
          ["Estado", txt(p.condition)],
          ["Antigüedad", p.isNew ? "A estrenar" : p.ageYears ? `${p.ageYears} años` : null],
          ["Plantas", txt(p.floorsCount)],
          ["Orientación", txt(p.orientation)],
          ["Agua caliente", txt(p.hotWater)],
          ["Disposición", txt(p.disposition)],
          ["Calefacción", txt(p.heating)],
          ["Dormitorios", txt(p.rooms)],
          ["Baños", txt(p.bathrooms)],
          ["Cocheras cubiertas", txt(p.coveredGarages)],
          ["Cocheras descubiertas", txt(p.openGarages)],
          ["Cocheras semicubiertas", txt(p.semiCoveredGarages)],
          ["Cochera optativa", txt(p.garageOptional)],
        ]}
      />
      <Bloque
        titulo="Edificio"
        filas={[
          ["Tipo", txt(p.buildingType)],
          ["Categoría", txt(p.buildingCategory)],
          ["Pisos", txt(p.buildingFloors)],
          ["Dptos/piso", txt(p.buildingApartmentsPerFloor)],
          ["Ascensores principales", txt(p.buildingMainElevators)],
          ["Ascensores de servicio", txt(p.buildingServiceElevators)],
        ]}
      />
      <Lista titulo="Servicios de la propiedad" items={p.services} />
      <Lista titulo="Instalaciones" items={p.installations} />
      <Lista titulo="Servicios del edificio" items={p.buildingServices} />
      <Lista titulo="Amenities del edificio" items={p.buildingAmenities} />
      <Lista titulo="Otros datos de Adinco" items={p.otherData} />
      {Boolean(p.description) && <p className="whitespace-pre-line text-sm text-muted">{String(p.description)}</p>}
      {Boolean(p.videos?.length || p.virtualTourUrl) && (
        <div className="flex flex-col gap-1 text-sm">
          {p.videos?.map((v) => (
            <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Video ↗</a>
          ))}
          {Boolean(p.virtualTourUrl) && (
            <a href={String(p.virtualTourUrl)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Tour virtual ↗</a>
          )}
        </div>
      )}
    </div>
  );
}

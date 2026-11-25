import { PROPERTY_TYPES } from "@/lib/property-types";
import { MONEDAS, OPERACIONES } from "@/lib/propiedades";
import {
  AGUA_A_CARGO_DE,
  AGUA_CALIENTE,
  AMENITIES_EDIFICIO,
  A_CARGO_DE,
  CALEFACCION,
  CATEGORIAS_EDIFICIO,
  DISPOSICIONES,
  ESTADOS_CONSERVACION,
  INSTALACIONES_PROPIEDAD,
  ORIENTACIONES,
  SERVICIOS_EDIFICIO,
  SERVICIOS_PROPIEDAD,
  SUBTIPOS,
  TIPOS_EDIFICIO,
} from "@/lib/property-features";

// Campos de lo que se publica de una ficha propia (alta y edición), en el
// mismo orden y con las mismas opciones que el formulario de carga de
// Adinco. Los nombres de los campos son las columnas de Listing.

// Valores actuales de la ficha (o nada en el alta). Se tipa suelto a
// propósito: recibe la fila de Listing tal cual, con Decimal y demás.
export type PublicacionDefaults = { [campo: string]: unknown; videos?: { url: string }[] };

const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function Campo({ label, children, ancho = 1 }: { label: string; children: React.ReactNode; ancho?: 1 | 2 | 4 }) {
  const span = ancho === 4 ? "sm:col-span-2 lg:col-span-4" : ancho === 2 ? "sm:col-span-2" : "";
  return (
    <label className={`flex flex-col gap-1.5 ${span}`}>
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">{titulo}</legend>
      {nota && <p className="mb-3 text-xs text-muted">{nota}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </fieldset>
  );
}

function Texto({ d, name, label, ancho, placeholder, required }: { d: PublicacionDefaults; name: string; label: string; ancho?: 1 | 2 | 4; placeholder?: string; required?: boolean }) {
  return (
    <Campo label={label + (required ? "*" : "")} ancho={ancho}>
      <input name={name} required={required} defaultValue={txt(d[name])} className="field" placeholder={placeholder} />
    </Campo>
  );
}

function Numero({ d, name, label, decimal }: { d: PublicacionDefaults; name: string; label: string; decimal?: boolean }) {
  return (
    <Campo label={label}>
      <input name={name} type="number" min={decimal ? undefined : 0} step="any" defaultValue={txt(d[name])} className="field" />
    </Campo>
  );
}

// Desplegable. Si la ficha trae un valor que no está en la lista (vino
// así de Adinco), se agrega como opción para no perderlo al guardar.
function Opciones({ d, name, label, opciones, required, vacio = "- Seleccionar -" }: {
  d: PublicacionDefaults;
  name: string;
  label: string;
  opciones: readonly (string | { value: string; label: string })[];
  required?: boolean;
  vacio?: string;
}) {
  const lista = opciones.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const actual = txt(d[name]);
  if (actual && !lista.some((o) => o.value === actual)) lista.push({ value: actual, label: actual });
  return (
    <Campo label={label + (required ? "*" : "")}>
      <select name={name} required={required} defaultValue={actual} className="field">
        <option value="" disabled={required}>{vacio}</option>
        {lista.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Campo>
  );
}

function Marca({ d, name, label, porDefecto = false }: { d: PublicacionDefaults; name: string; label: string; porDefecto?: boolean }) {
  const v = d[name];
  return (
    <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
      <input type="checkbox" name={name} defaultChecked={v === undefined || v === null ? porDefecto : Boolean(v)} />
      {label}
    </label>
  );
}

function Casillas({ d, name, titulo, opciones }: { d: PublicacionDefaults; name: string; titulo: string; opciones: readonly string[] }) {
  const marcadas = new Set(Array.isArray(d[name]) ? (d[name] as string[]) : []);
  return (
    <details className="rounded-xl border border-border p-4" open={marcadas.size > 0}>
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        {titulo} {marcadas.size > 0 && <span className="font-normal text-muted">({marcadas.size} marcados)</span>}
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {opciones.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name={name} value={o} defaultChecked={marcadas.has(o)} />
            {o}
          </label>
        ))}
      </div>
    </details>
  );
}

export function PropiedadPublicacionFields({ d = {} }: { d?: PublicacionDefaults }) {
  return (
    <div className="flex flex-col gap-5">
      <Seccion titulo="Datos básicos">
        <Texto d={d} name="contentTitle" label="Título corto y descriptivo" ancho={4} required placeholder="ALQUILA DEPARTAMENTO 1 DORMITORIO" />
        <Opciones d={d} name="propertyType" label="Tipo de propiedad" opciones={PROPERTY_TYPES} required />
        <Opciones d={d} name="propertySubtype" label="Edificación (subtipo)" opciones={SUBTIPOS} />
        <Opciones d={d} name="operationType" label="Operación" opciones={OPERACIONES} required />
        <div />
        <Numero d={d} name="priceAmount" label="Monto" decimal />
        <Opciones d={d} name="priceCurrency" label="Moneda" opciones={MONEDAS} vacio="-" />
        <Marca d={d} name="hidePrice" label="No publicar precio" />
        <div />
        <Numero d={d} name="expenses" label="Expensas (ARS)" decimal />
        <Marca d={d} name="expensesApproximate" label="Expensas aproximadas" />
        <Opciones d={d} name="aptoCredito" label="Apto crédito" opciones={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]} vacio="Sin dato" />
        <div />
        <Marca d={d} name="aptoProfesional" label="Apto profesional" />
        <Marca d={d} name="aceptaMascotas" label="Acepta mascotas" />
        <Marca d={d} name="ocupada" label="Propiedad ocupada" />
      </Seccion>

      <Seccion titulo="Datos de alquiler" nota="Solo para alquileres: en una venta se ignoran.">
        <Numero d={d} name="depositMonths" label="Depósito (meses)" />
        <Opciones d={d} name="taxesPaidBy" label="Impuestos a cargo de" opciones={A_CARGO_DE} />
        <Opciones d={d} name="waterPaidBy" label="Agua a cargo de" opciones={AGUA_A_CARGO_DE} />
      </Seccion>

      <Seccion titulo="Ubicación">
        <Marca d={d} name="gatedCommunity" label="Pertenece a un country / barrio cerrado" />
        <div className="hidden lg:block" />
        <div className="hidden lg:block" />
        <div className="hidden lg:block" />
        <Campo label="Zona geográfica (provincia)">
          <input name="region" defaultValue={txt(d.region) || "Corrientes"} className="field" />
        </Campo>
        <Texto d={d} name="city" label="Partido / Localidad" />
        <Texto d={d} name="neighborhood" label="Barrio / Ciudad" />
        <div />
        <Texto d={d} name="addressName" label="Calle" />
        <Texto d={d} name="addressNumber" label="Nro. calle" />
        <Texto d={d} name="addressFloor" label="Piso" />
        <Texto d={d} name="addressApartment" label="Depto." />
        <Marca d={d} name="showExactAddress" label="Mostrar la dirección exacta en el sitio" porDefecto />
        <div className="hidden lg:block" />
        <div className="hidden lg:block" />
        <div className="hidden lg:block" />
        <Texto d={d} name="betweenStreet1" label="Entre calle" />
        <Texto d={d} name="betweenStreet2" label="Y calle" />
        <Texto d={d} name="nearStreet" label="Cerca de" />
        <div />
        <Numero d={d} name="latitude" label="Latitud" decimal />
        <Numero d={d} name="longitude" label="Longitud" decimal />
      </Seccion>

      <Seccion titulo="Características de la propiedad">
        <Numero d={d} name="plotArea" label="Superficie total (m²)" decimal />
        <Numero d={d} name="floorArea" label="Superficie cubierta (m²)" decimal />
        <Numero d={d} name="uncoveredArea" label="Superficie descubierta (m²)" decimal />
        <Numero d={d} name="backyardArea" label="Fondo libre (m²)" decimal />
        <Opciones d={d} name="condition" label="Estado de la propiedad" opciones={ESTADOS_CONSERVACION} />
        <Numero d={d} name="ageYears" label="Antigüedad (años)" />
        <Marca d={d} name="isNew" label="A estrenar" />
        <Numero d={d} name="floorsCount" label="Plantas" />
        <Opciones d={d} name="orientation" label="Orientación" opciones={ORIENTACIONES} />
        <Opciones d={d} name="hotWater" label="Agua caliente" opciones={AGUA_CALIENTE} />
        <Opciones d={d} name="disposition" label="Disposición" opciones={DISPOSICIONES} />
        <Opciones d={d} name="heating" label="Calefacción" opciones={CALEFACCION} />
      </Seccion>

      <Seccion titulo="Características del edificio">
        <Opciones d={d} name="buildingType" label="Tipo de edificio" opciones={TIPOS_EDIFICIO} />
        <Opciones d={d} name="buildingCategory" label="Categoría de edificio" opciones={CATEGORIAS_EDIFICIO} />
        <Numero d={d} name="buildingFloors" label="Cantidad de pisos" />
        <Numero d={d} name="buildingApartmentsPerFloor" label="Dptos/piso" />
        <Numero d={d} name="buildingMainElevators" label="Ascensores principales" />
        <Numero d={d} name="buildingServiceElevators" label="Ascensores de servicio" />
      </Seccion>

      <Seccion titulo="Cocheras y ambientes">
        <Marca d={d} name="garageOptional" label="Cochera optativa" />
        <Numero d={d} name="coveredGarages" label="Cocheras cubiertas" />
        <Numero d={d} name="openGarages" label="Cocheras descubiertas" />
        <Numero d={d} name="semiCoveredGarages" label="Cocheras semicubiertas" />
        <Numero d={d} name="rooms" label="Cantidad de dormitorios" />
        <Numero d={d} name="bathrooms" label="Cantidad de baños" />
      </Seccion>

      <Casillas d={d} name="services" titulo="Servicios de la propiedad" opciones={SERVICIOS_PROPIEDAD} />
      <Casillas d={d} name="installations" titulo="Instalaciones de la propiedad" opciones={INSTALACIONES_PROPIEDAD} />
      <Casillas d={d} name="buildingServices" titulo="Servicios del edificio" opciones={SERVICIOS_EDIFICIO} />
      <Casillas d={d} name="buildingAmenities" titulo="Amenities del edificio" opciones={AMENITIES_EDIFICIO} />

      <Seccion titulo="Descripción">
        <Campo label="Descripción*" ancho={4}>
          <textarea name="description" required rows={10} defaultValue={txt(d.description)} className="field" />
        </Campo>
      </Seccion>

      <Seccion titulo="Multimedia" nota="Las fotos se cargan en la ficha, después de guardar.">
        <Campo label="Videos (un link de YouTube por línea)" ancho={2}>
          <textarea name="videoUrls" rows={3} defaultValue={(d.videos ?? []).map((v) => v.url).join("\n")} className="field" placeholder="https://www.youtube.com/watch?v=..." />
        </Campo>
        <Texto d={d} name="virtualTourUrl" label="Tour virtual (link)" ancho={2} />
      </Seccion>
    </div>
  );
}

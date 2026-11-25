import { PROPERTY_TYPES } from "@/lib/property-types";
import { MONEDAS, OPERACIONES } from "@/lib/propiedades";

// Campos de lo que se publica de una ficha propia (alta y edición).
// Mismos nombres de columna que Listing, que es lo que lee el sitio.

export interface PublicacionDefaults {
  contentTitle?: string | null;
  description?: string | null;
  operationType?: string | null;
  propertyType?: string | null;
  priceAmount?: unknown;
  priceCurrency?: string | null;
  priceRaw?: string | null;
  expenses?: unknown;
  addressName?: string | null;
  addressNumber?: string | null;
  addressFloor?: string | null;
  addressApartment?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  region?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  floorArea?: unknown;
  plotArea?: unknown;
  rooms?: number | null;
  bathrooms?: number | null;
  coveredGarages?: number | null;
  year?: number | null;
  aptoCredito?: boolean | null;
}

const val = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function Campo({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2 lg:col-span-4" : ""}`}>
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

export function PropiedadPublicacionFields({ d = {} }: { d?: PublicacionDefaults }) {
  const consultar = d.priceAmount === null || d.priceAmount === undefined ? Boolean(d.priceRaw) : false;
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">Aviso</legend>
        <Campo label="Título*" wide>
          <input name="contentTitle" required defaultValue={val(d.contentTitle)} className="field" placeholder="Casa 3 dormitorios con pileta en barrio Santa Ana" />
        </Campo>
        <Campo label="Operación*">
          <select name="operationType" required defaultValue={val(d.operationType)} className="field">
            <option value="" disabled>Elegir...</option>
            {OPERACIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Campo>
        <Campo label="Tipo de propiedad*">
          <select name="propertyType" required defaultValue={val(d.propertyType)} className="field">
            <option value="" disabled>Elegir...</option>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Campo>
        <Campo label="Precio">
          <input name="priceAmount" type="number" min="0" step="any" defaultValue={val(d.priceAmount)} className="field" />
        </Campo>
        <Campo label="Moneda">
          <select name="priceCurrency" defaultValue={val(d.priceCurrency) || "USD"} className="field">
            {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Campo>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="consultarPrecio" defaultChecked={consultar} />
          Consultar precio (no se muestra el monto)
        </label>
        <Campo label="Expensas (ARS)">
          <input name="expenses" type="number" min="0" step="any" defaultValue={val(d.expenses)} className="field" />
        </Campo>
        <Campo label="Descripción" wide>
          <textarea name="description" rows={6} defaultValue={val(d.description)} className="field" />
        </Campo>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">Ubicación</legend>
        <Campo label="Calle">
          <input name="addressName" defaultValue={val(d.addressName)} className="field" />
        </Campo>
        <Campo label="Número">
          <input name="addressNumber" defaultValue={val(d.addressNumber)} className="field" />
        </Campo>
        <Campo label="Piso">
          <input name="addressFloor" defaultValue={val(d.addressFloor)} className="field" />
        </Campo>
        <Campo label="Depto.">
          <input name="addressApartment" defaultValue={val(d.addressApartment)} className="field" />
        </Campo>
        <Campo label="Barrio">
          <input name="neighborhood" defaultValue={val(d.neighborhood)} className="field" />
        </Campo>
        <Campo label="Localidad">
          <input name="city" defaultValue={val(d.city)} className="field" />
        </Campo>
        <Campo label="Provincia">
          <input name="region" defaultValue={val(d.region) || "Corrientes"} className="field" />
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Latitud">
            <input name="latitude" type="number" step="any" defaultValue={val(d.latitude)} className="field" />
          </Campo>
          <Campo label="Longitud">
            <input name="longitude" type="number" step="any" defaultValue={val(d.longitude)} className="field" />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-semibold text-foreground">Características</legend>
        <Campo label="Sup. cubierta (m²)">
          <input name="floorArea" type="number" min="0" step="any" defaultValue={val(d.floorArea)} className="field" />
        </Campo>
        <Campo label="Sup. terreno (m²)">
          <input name="plotArea" type="number" min="0" step="any" defaultValue={val(d.plotArea)} className="field" />
        </Campo>
        <Campo label="Dormitorios">
          <input name="rooms" type="number" min="0" defaultValue={val(d.rooms)} className="field" />
        </Campo>
        <Campo label="Baños">
          <input name="bathrooms" type="number" min="0" defaultValue={val(d.bathrooms)} className="field" />
        </Campo>
        <Campo label="Cocheras">
          <input name="coveredGarages" type="number" min="0" defaultValue={val(d.coveredGarages)} className="field" />
        </Campo>
        <Campo label="Año de construcción">
          <input name="year" type="number" min="1800" max="2100" defaultValue={val(d.year)} className="field" />
        </Campo>
        <Campo label="Apto crédito">
          <select name="aptoCredito" defaultValue={d.aptoCredito === true ? "si" : d.aptoCredito === false ? "no" : ""} className="field">
            <option value="">Sin dato</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </Campo>
      </fieldset>
    </div>
  );
}

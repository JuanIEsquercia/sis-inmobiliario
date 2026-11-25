// Catálogo de la ficha de propiedad: las mismas opciones que el
// formulario de carga de Adinco, para que la ficha propia se cargue
// igual y lo que llega en el XML caiga en el mismo casillero.
//
// Funciones puras (sin base de datos): las usan el parser del feed, el
// formulario del backoffice y el sitio público.

// --- Listas para marcar ---------------------------------------------------

export const SERVICIOS_PROPIEDAD = [
  "ABL", "Agua Corriente", "Cloacas", "Electricidad", "Gas", "Gas envasado", "Internet", "Lavandería",
  "Limpieza", "Pavimento", "Rentas municipales", "Ropa de cama", "Seguridad", "Teléfono", "Toallas", "Videocable",
] as const;

export const INSTALACIONES_PROPIEDAD = [
  "Aire acondicionado", "Alarma", "Amueblado", "Balcón", "Balcón terraza", "Caja fuerte", "Calefacción",
  "Calefacción tiro balanceado", "Calefón", "Cocina equipada", "Dependencia", "Extractor aire", "Frigobar",
  "Hogar a leña", "Lavadero", "Lavarropas", "Lavavajillas", "Microondas", "Patio", "Piso radiante", "Radiadores",
  "Rampa para silla de ruedas", "Reciclado", "Secarropas", "Termotanque", "Terraza", "Toilette",
] as const;

export const SERVICIOS_EDIFICIO = ["Internet", "Seguridad", "Teléfono", "Videocable"] as const;

export const AMENITIES_EDIFICIO = [
  "Ascensor", "Baulera", "Bicicletero", "Caldera", "Cancha de básquetbol", "Cancha de deportes", "Cancha de paddle",
  "Cancha de tenis", "Coworking", "Energía solar", "Espacios verdes", "Estacionamiento de cortesía", "Gimnasio",
  "Grupo electrógeno", "Hidromasaje", "Jacuzzi", "Jardín", "Juegos para chicos", "Lavadero", "Lobby", "Microcine",
  "Parrilla", "Pileta", "Piscina climatizada", "Piscina para niños", "Portero visor", "Quincho techado", "Recepción",
  "Roof garden", "Rooftop pool", "SUM", "Sala de juegos", "Sala de masajes", "Sala de relax", "Salón de fiestas",
  "Sauna", "Sistema contra incendio", "Solarium", "Spa", "Terraza del Edificio", "Vestuario", "Vigilancia",
  "Vivienda encargado",
] as const;

// --- Desplegables (valores tal cual los manda Adinco) ---------------------

export const SUBTIPOS = ["Casa", "Chalet", "Departamento", "Duplex", "Piso", "PH", "Triplex", "Loft", "Monoambiente"];
export const ESTADOS_CONSERVACION = ["Excelente", "Muy bueno", "Bueno", "Regular", "A refaccionar", "A reciclar"];
export const ORIENTACIONES = ["Norte", "Noreste", "Este", "Sudeste", "Sur", "Sudoeste", "Oeste", "Noroeste"];
export const AGUA_CALIENTE = ["Termotanque", "Calefón", "Central", "Solar", "Eléctrico"];
export const DISPOSICIONES = ["Al frente", "Contrafrente", "Interno", "Lateral"];
export const CALEFACCION = ["Acondicionador de aire", "Losa radiante", "Radiadores", "Tiro balanceado", "Estufa", "Central", "Hogar a leña", "Sin calefacción"];
export const TIPOS_EDIFICIO = ["Estandard", "Primera categoría", "Antiguo", "Esquina", "Inteligente", "Torre"];
export const CATEGORIAS_EDIFICIO = ["A estrenar", "Excelente", "Muy bueno", "Bueno", "Regular"];

export const A_CARGO_DE = [
  { value: "INQUILINO", label: "Inquilino" },
  { value: "PROPIETARIO", label: "Propietario" },
];
export const AGUA_A_CARGO_DE = [...A_CARGO_DE, { value: "EXPENSAS", label: "Incluida en expensas" }];

// --- Reparto de lo que manda el XML ---------------------------------------

function clave(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Nombres viejos o alternativos que usa el XML para opciones que en el
// formulario actual se llaman distinto.
const ALIAS: Record<string, string> = {
  "servicio de limpieza": "Limpieza",
  "jardin trasero": "Jardín",
  "jardin delantero": "Jardín",
  "servicio contra incendios": "Sistema contra incendio",
  "quincho": "Quincho techado",
};

function indice(lista: readonly string[]): Map<string, string> {
  return new Map(lista.map((v) => [clave(v), v]));
}
const IDX_SERVICIOS = indice(SERVICIOS_PROPIEDAD);
const IDX_INSTALACIONES = indice(INSTALACIONES_PROPIEDAD);
const IDX_AMENITIES = indice(AMENITIES_EDIFICIO);

export interface CaracteristicasClasificadas {
  services: string[];
  installations: string[];
  buildingAmenities: string[];
  // Lo que no corresponde a ninguna opción del formulario: se conserva
  // como "Otros datos" para no perder nada.
  otherData: string[];
}

// El XML manda los servicios en una lista y las instalaciones y los
// amenities mezclados en otra ("other_data"). Se reparten en las listas
// del formulario por nombre (sin tildes ni mayúsculas). "Lavadero" está
// en las dos listas de Adinco: se toma como instalación de la propiedad.
export function clasificarCaracteristicas(servicios: string[], otros: string[]): CaracteristicasClasificadas {
  const r: CaracteristicasClasificadas = { services: [], installations: [], buildingAmenities: [], otherData: [] };
  const agregar = (lista: string[], v: string) => {
    if (!lista.includes(v)) lista.push(v);
  };

  for (const original of [...servicios, ...otros]) {
    const k = clave(original);
    const nombre = ALIAS[k] ?? original;
    const kn = clave(nombre);
    if (IDX_SERVICIOS.has(kn)) agregar(r.services, IDX_SERVICIOS.get(kn)!);
    else if (IDX_INSTALACIONES.has(kn)) agregar(r.installations, IDX_INSTALACIONES.get(kn)!);
    else if (IDX_AMENITIES.has(kn)) agregar(r.buildingAmenities, IDX_AMENITIES.get(kn)!);
    else agregar(r.otherData, original);
  }
  return r;
}

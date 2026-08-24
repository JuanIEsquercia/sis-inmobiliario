import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

// --- parsing helpers -------------------------------------------------------
// The Adinco feed wraps every value in CDATA and leaves lots of fields as
// empty strings when unknown, so every scalar coming out of the parser is
// "string | number | undefined" and needs to be coerced defensively.

const REPEATABLE_TAGS = new Set([
  "ad",
  "picture",
  "video",
  "service",
  "other",
  "phone",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  isArray: (tagName) => REPEATABLE_TAGS.has(tagName),
});

function toArray<T>(value: T | T[] | "" | undefined | null): T[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value;
  return [value as T];
}

function str(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function decimalStr(value: unknown): string | null {
  const s = str(value);
  if (s === null) return null;
  return /^-?\d+(\.\d+)?$/.test(s) ? s : null;
}

function intOrNull(value: unknown): number | null {
  const s = str(value);
  if (s === null) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function boolOrNull(value: unknown): boolean | null {
  const s = str(value);
  if (s === null) return null;
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return null;
}

function dateOrNull(value: unknown): Date | null {
  const s = str(value);
  if (s === null) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// --- normalized shape --------------------------------------------------

export interface NormalizedImage {
  url: string;
  isFeatured: boolean;
  sortOrder: number;
}

export interface NormalizedVideo {
  url: string;
}

export interface NormalizedAgency {
  externalId: string;
  name: string;
  logoUrl: string | null;
  officeAddress: string | null;
  officeZipCode: string | null;
  phones: string[];
}

export interface NormalizedListing {
  externalId: string;
  sourceUrl: string | null;
  title: string;
  contentTitle: string | null;
  description: string | null;
  operationType: string;
  propertyType: string;
  priceAmount: string | null;
  priceCurrency: string | null;
  priceRaw: string | null;
  pricePerHectare: string | null;
  expenses: string | null;
  address: string | null;
  addressName: string | null;
  addressNumber: string | null;
  addressFloor: string | null;
  addressApartment: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  neighborhood: string | null;
  postcode: string | null;
  latitude: string | null;
  longitude: string | null;
  orientation: string | null;
  floorArea: string | null;
  plotArea: string | null;
  landArea: string | null;
  rooms: number | null;
  bathrooms: number | null;
  condition: string | null;
  year: number | null;
  isNew: boolean | null;
  buildingFloors: number | null;
  buildingMainElevators: number | null;
  buildingType: string | null;
  buildingCategory: string | null;
  coveredGarages: number | null;
  aptoCredito: boolean | null;
  fieldLength: string | null;
  fieldWidth: string | null;
  accessDetail: string | null;
  distancePavement: string | null;
  countryType: string | null;
  services: string[];
  otherData: string[];
  sellerName: string | null;
  sellerEmail: string | null;
  sourceUpdatedAt: Date | null;
  rawData: unknown;
  agency: NormalizedAgency | null;
  images: NormalizedImage[];
  videos: NormalizedVideo[];
}

export interface ParseFeedResult {
  listings: NormalizedListing[];
  skipped: { index: number; reason: string }[];
}

// Only the handful of fields we can't operate without get schema-validated;
// the rest of the feed is too loosely typed by Adinco to be worth a rigid
// shape, so it's coerced defensively above instead.
const RawAdCoreSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1)),
  title: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1)),
  type: z.string().min(1),
  property_type: z.string().min(1),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawAd = any;

function normalizeAd(raw: RawAd): NormalizedListing {
  const core = RawAdCoreSchema.parse(raw);

  const pictures = toArray(raw.pictures?.picture).map(
    (p: RawAd, i: number): NormalizedImage => ({
      url: str(p?.picture_url) ?? "",
      isFeatured: p?.["@_featured"] === "true",
      sortOrder: i,
    })
  ).filter((p) => p.url.length > 0);

  const videos = toArray(raw.videos?.video)
    .map((v: RawAd): NormalizedVideo => ({ url: str(v?.video_url) ?? "" }))
    .filter((v) => v.url.length > 0);

  const services = toArray(raw.services?.service).map(str).filter((v): v is string => !!v);
  const otherData = toArray(raw.other_data?.other).map(str).filter((v): v is string => !!v);

  const realEstateId = str(raw.real_estate_info?.real_estate_id);
  const agency: NormalizedAgency | null = realEstateId
    ? {
        externalId: realEstateId,
        name: str(raw.real_estate_info?.real_estate_name) ?? str(raw.agency) ?? "Sin nombre",
        logoUrl: str(raw.real_estate_info?.real_estate_logo),
        officeAddress: str(raw.real_estate_info?.office_address),
        officeZipCode: str(raw.real_estate_info?.office_zip_code),
        phones: toArray(raw.real_estate_info?.office_telephones?.phone)
          .map(str)
          .filter((v): v is string => !!v),
      }
    : null;

  const priceRaw = str(raw.price?.["#text"] ?? raw.price);

  return {
    externalId: core.id,
    sourceUrl: str(raw.url),
    title: core.title,
    contentTitle: str(raw.content_title),
    description: str(raw.content),
    operationType: core.type,
    propertyType: core.property_type,
    priceAmount: decimalStr(raw.price?.["#text"] ?? raw.price),
    priceCurrency: str(raw.price?.["@_currency"]),
    priceRaw,
    pricePerHectare: decimalStr(raw.price_hectare),
    expenses: decimalStr(raw.expenses),
    address: str(raw.address),
    addressName: str(raw.address_name),
    addressNumber: str(raw.address_number),
    addressFloor: str(raw.address_floor),
    addressApartment: str(raw.address_apartment),
    country: str(raw.country),
    region: str(raw.region),
    city: str(raw.city),
    neighborhood: str(raw.neighborhood),
    postcode: str(raw.postcode),
    latitude: decimalStr(raw.latitude),
    longitude: decimalStr(raw.longitude),
    orientation: str(raw.orientation),
    floorArea: decimalStr(raw.floor_area),
    plotArea: decimalStr(raw.plot_area),
    landArea: decimalStr(raw.land_area),
    rooms: intOrNull(raw.rooms),
    bathrooms: intOrNull(raw.bathrooms),
    condition: str(raw.condition),
    year: intOrNull(raw.year),
    isNew: boolOrNull(raw.is_new),
    buildingFloors: intOrNull(raw.building_floors),
    buildingMainElevators: intOrNull(raw.building_main_elevators),
    buildingType: str(raw.building_type),
    buildingCategory: str(raw.building_category),
    coveredGarages: intOrNull(raw.covered_garages),
    aptoCredito: boolOrNull(raw.apto_credito),
    fieldLength: decimalStr(raw.field_length),
    fieldWidth: decimalStr(raw.field_width),
    accessDetail: str(raw.access_detail),
    distancePavement: decimalStr(raw.distance_pavement),
    countryType: str(raw.country_type),
    services,
    otherData,
    sellerName: str(raw.seller_info?.full_name),
    sellerEmail: str(raw.seller_info?.email),
    sourceUpdatedAt: dateOrNull(raw.date),
    rawData: raw,
    agency,
    images: pictures,
    videos,
  };
}

export function parseFeed(xml: string): ParseFeedResult {
  const doc = parser.parse(xml);
  const rawAds = toArray(doc?.ADS?.ad);

  const listings: NormalizedListing[] = [];
  const skipped: { index: number; reason: string }[] = [];

  rawAds.forEach((raw, index) => {
    try {
      listings.push(normalizeAd(raw));
    } catch (err) {
      skipped.push({
        index,
        reason: err instanceof Error ? err.message : "unknown error",
      });
    }
  });

  return { listings, skipped };
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { getListingById } from "@/lib/listings";
import { formatArea, formatDate, formatPrice, operationLabel } from "@/lib/format";
import { AGENCY_PHONE, toWhatsAppLink } from "@/lib/whatsapp";

interface PageProps {
  params: Promise<{ id: string }>;
}

function youtubeEmbedUrl(url: string): string | null {
  const short = url.match(/youtu\.be\/([\w-]+)/);
  const long = url.match(/[?&]v=([\w-]+)/);
  const id = short?.[1] ?? long?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const listing = await getListingById(numericId);
  if (!listing) notFound();

  const displayTitle = listing.contentTitle ?? listing.title;
  const locationText = [listing.address, listing.city, listing.region].filter(Boolean).join(", ");
  const expensesFormatted = listing.expenses ? String(listing.expenses) : null;

  const surfaces = [
    ["Superficie cubierta", formatArea(listing.floorArea)],
    ["Superficie de lote", formatArea(listing.plotArea)],
    ["Superficie de terreno", formatArea(listing.landArea)],
    ["Frente / fondo", listing.fieldLength && listing.fieldWidth ? `${listing.fieldLength} m / ${listing.fieldWidth} m` : null],
  ].filter((row): row is [string, string] => row[1] !== null);

  const buildingDetails = [
    ["Estado", listing.condition],
    ["Año de construcción", listing.year ? String(listing.year) : null],
    ["Pisos del edificio", listing.buildingFloors ? String(listing.buildingFloors) : null],
    ["Ascensores", listing.buildingMainElevators ? String(listing.buildingMainElevators) : null],
    ["Categoría del edificio", listing.buildingCategory],
    ["Uso del campo", listing.countryType],
  ].filter((row): row is [string, string] => row[1] !== null);

  const financialDetails = [
    ["Expensas", expensesFormatted ? `$ ${expensesFormatted}` : null],
    ["Precio por hectárea", listing.pricePerHectare ? `USD ${String(listing.pricePerHectare)}` : null],
    ["Apto crédito", listing.aptoCredito === null ? null : listing.aptoCredito ? "Sí" : "No"],
  ].filter((row): row is [string, string] => row[1] !== null);

  const mapsUrl =
    listing.latitude && listing.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`
      : listing.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`
      : null;

  // Mensaje preconfigurado para consulta — toWhatsAppLink hace su propio
  // encodeURIComponent, así que acá va el texto plano (encodearlo antes
  // rompería el link con un doble encoding). Se manda el Código (el
  // mismo identificador Adinco que usa el equipo puertas adentro —
  // Unit.propertyCode, Historial, etc.), no el id interno de la base:
  // así quien atiende el WhatsApp puede ubicar la propiedad en el
  // sistema sin tener que preguntar de cuál se trata.
  const whatsappMessage = `Hola! Me interesa obtener más información sobre la propiedad: "${displayTitle}" (Código ${listing.externalId}).`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      {/* Botón Volver y Encabezado Hero de la Propiedad */}
      <div className="space-y-4">
        <Link
          href="/propiedades"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-accent transition-colors duration-200"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span>Volver al catálogo</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent border border-accent/20">
                {operationLabel(listing.operationType)}
              </span>
              <span className="rounded-lg bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground border border-border/60">
                {listing.propertyType}
              </span>
              {listing.aptoCredito && (
                <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Apto Crédito
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              {displayTitle}
            </h1>

            {locationText && (
              <p className="text-sm text-muted flex items-center gap-1.5 pt-1">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent flex-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span>{locationText}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Precio</span>
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-accent">
              {formatPrice(listing)}
            </span>
            {expensesFormatted && (
              <span className="text-xs font-medium text-muted mt-1">
                + ${expensesFormatted} expensas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Galería Mosaico Compacta (Max-height ~420px) */}
      <Gallery images={listing.images} title={displayTitle} />

      {/* Barra de Especificaciones Rápidas (Quick Specs Strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {listing.rooms !== null && listing.rooms !== undefined && (
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/60 bg-surface/80 shadow-sm text-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mb-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            <span className="text-xs text-muted font-medium">Dormitorios</span>
            <span className="text-sm font-bold text-foreground">{listing.rooms} hab.</span>
          </div>
        )}

        {listing.bathrooms !== null && listing.bathrooms !== undefined && (
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/60 bg-surface/80 shadow-sm text-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mb-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12V5a2 2 0 0 1 2-2h2" />
            </svg>
            <span className="text-xs text-muted font-medium">Baños</span>
            <span className="text-sm font-bold text-foreground">{listing.bathrooms} baños</span>
          </div>
        )}

        {(listing.floorArea || listing.plotArea) && (
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/60 bg-surface/80 shadow-sm text-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mb-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5m0-16.5h16.5M3.75 3.75l16.5 16.5M3.75 20.25h16.5M20.25 3.75v16.5" />
            </svg>
            <span className="text-xs text-muted font-medium">Superficie</span>
            <span className="text-sm font-bold text-foreground">
              {formatArea(listing.floorArea) ?? formatArea(listing.plotArea)}
            </span>
          </div>
        )}

        {listing.coveredGarages !== null && listing.coveredGarages !== undefined && (
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/60 bg-surface/80 shadow-sm text-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mb-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25H9.75M14.25 7.5l-2.625-3.375a1.125 1.125 0 0 0-.892-.425H6.375c-.477 0-.914.303-1.07.75L3 7.5m11.25 0V12H3V7.5" />
            </svg>
            <span className="text-xs text-muted font-medium">Cocheras</span>
            <span className="text-sm font-bold text-foreground">{listing.coveredGarages} cub.</span>
          </div>
        )}

        {listing.condition && (
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/60 bg-surface/80 shadow-sm text-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mb-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385c.116.486-.41.869-.838.614l-4.708-2.802a.563.563 0 0 0-.58 0l-4.708 2.802c-.428.255-.954-.128-.838-.614l1.285-5.385a.563.563 0 0 0-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <span className="text-xs text-muted font-medium">Estado</span>
            <span className="text-sm font-bold text-foreground capitalize">{listing.condition}</span>
          </div>
        )}

        {listing.aptoCredito !== null && (
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/60 bg-surface/80 shadow-sm text-center">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent mb-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <span className="text-xs text-muted font-medium">Financiación</span>
            <span className="text-sm font-bold text-foreground">
              {listing.aptoCredito ? "Apto Crédito" : "No Apto Crédito"}
            </span>
          </div>
        )}
      </div>

      {/* Grid Principal de 2 Columnas: Detalles (Izquierda) y Tarjeta de Contacto (Derecha) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Columna Izquierda (~68%) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Descripción */}
          {listing.description && (
            <div className="rounded-3xl border border-border/60 bg-surface p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span>Descripción</span>
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted font-normal">
                {listing.description}
              </p>
            </div>
          )}

          {/* Características detalladas por categorías */}
          {(surfaces.length > 0 || buildingDetails.length > 0 || financialDetails.length > 0) && (
            <div className="rounded-3xl border border-border/60 bg-surface p-6 sm:p-8 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm0 5.25h.007v.008H3.75V12Zm0 5.25h.007v.008H3.75v-.008Z" />
                </svg>
                <span>Características Detalladas</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {[...surfaces, ...buildingDetails, ...financialDetails].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-border/40 pb-3 text-sm">
                    <span className="text-muted font-medium">{label}</span>
                    <span className="font-semibold text-foreground text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Servicios y Extras */}
          {(listing.services.length > 0 || listing.otherData.length > 0) && (
            <div className="rounded-3xl border border-border/60 bg-surface p-6 sm:p-8 shadow-sm space-y-6">
              {listing.services.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Servicios incluidos</h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.services.map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {listing.otherData.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Extras y Comodidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.otherData.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video de la propiedad */}
          {listing.videos.length > 0 && (
            <div className="rounded-3xl border border-border/60 bg-surface p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <span>Video Recorrido</span>
              </h2>

              {listing.videos.map((video) => {
                const embed = youtubeEmbedUrl(video.url);
                return embed ? (
                  <div key={video.url} className="aspect-video w-full overflow-hidden rounded-2xl border border-border/40 shadow-sm">
                    <iframe
                      src={embed}
                      title="Video recorrido de la propiedad"
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    key={video.url}
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-semibold text-accent hover:text-accent-strong transition-all"
                  >
                    Ver video completo en pestaña nueva ↗
                  </a>
                );
              })}
            </div>
          )}

          {/* Ubicación / Mapa */}
          {mapsUrl && (
            <div className="rounded-3xl border border-border/60 bg-surface p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.485 5.25 1.125a.75.75 0 0 1 .504.793v13.5a.75.75 0 0 1-1.023.666l-5.602-1.2-5.602 1.2a.75.75 0 0 1-.943-.33l-4.402-8.802a.75.75 0 0 1 .093-.764l5.25-6.75a.75.75 0 0 1 1.02-.128l5.202 3.902Z" />
                </svg>
                <span>Ubicación</span>
              </h2>

              <p className="text-sm text-muted">{locationText}</p>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-2xl border border-border/80 bg-background/80 p-4 text-sm font-bold text-foreground shadow-sm hover:border-accent hover:text-accent transition-all duration-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span>Abrir ubicación en Google Maps ↗</span>
              </a>
            </div>
          )}
        </div>

        {/* Columna Derecha Sticky (~32%): Tarjeta de Precio y Contacto */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
          <aside className="rounded-3xl border border-border/70 bg-surface p-6 sm:p-7 shadow-premium flex flex-col gap-6 backdrop-blur-md">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Precio de Publicación</span>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-accent mt-1">
                {formatPrice(listing)}
              </p>
              {expensesFormatted && (
                <p className="text-xs text-muted font-medium mt-1">
                  Expensas estimadas: <span className="font-semibold text-foreground">${expensesFormatted}</span>
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-border/50 pt-5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">¿Te interesa esta propiedad?</span>

              {/* Botón WhatsApp */}
              <a
                href={toWhatsAppLink(AGENCY_PHONE, whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.143 4.174 4.286-1.124z" />
                </svg>
                <span>Consultar por WhatsApp</span>
              </a>

              {/* Botón Contactar Equipo */}
              <Link
                href="/equipo"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-background/80 px-5 py-3.5 text-sm font-bold text-foreground shadow-sm hover:border-accent hover:text-accent hover:bg-surface transition-all cursor-pointer"
              >
                <span>Hablar con un asesor</span>
              </Link>
            </div>

            {/* Sello de Confianza García Propiedades */}
            <div className="rounded-2xl border border-border/40 bg-background/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                <span className="text-xs font-bold text-foreground">García Propiedades</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                Asesoramiento personalizado, seguridad jurídica y el respaldo de años de trayectoria inmobiliaria.
              </p>
            </div>

            {listing.sourceUpdatedAt && (
              <p className="text-[10px] text-muted text-center uppercase font-bold tracking-wider pt-1">
                Actualizado el {formatDate(listing.sourceUpdatedAt)}
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

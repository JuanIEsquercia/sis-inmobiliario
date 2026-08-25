import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { getListingById } from "@/lib/listings";
import { formatArea, formatDate, formatPrice, operationLabel } from "@/lib/format";

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

  const characteristics: [string, string][] = [
    ["Estado", listing.condition],
    ["Año", listing.year ? String(listing.year) : null],
    ["Superficie cubierta", formatArea(listing.floorArea)],
    ["Superficie de lote", formatArea(listing.plotArea)],
    ["Superficie de terreno", formatArea(listing.landArea)],
    ["Ambientes", listing.rooms ? String(listing.rooms) : null],
    ["Baños", listing.bathrooms ? String(listing.bathrooms) : null],
    ["Cocheras cubiertas", listing.coveredGarages ? String(listing.coveredGarages) : null],
    ["Pisos del edificio", listing.buildingFloors ? String(listing.buildingFloors) : null],
    ["Ascensores", listing.buildingMainElevators ? String(listing.buildingMainElevators) : null],
    ["Categoría del edificio", listing.buildingCategory],
    ["Frente / fondo", listing.fieldLength && listing.fieldWidth ? `${listing.fieldLength} m / ${listing.fieldWidth} m` : null],
    ["Uso del campo", listing.countryType],
    ["Expensas", listing.expenses ? `$ ${listing.expenses}` : null],
    ["Precio por hectárea", listing.pricePerHectare ? `USD ${listing.pricePerHectare}` : null],
    ["Apto crédito", listing.aptoCredito === null ? null : listing.aptoCredito ? "Sí" : "No"],
  ].filter((row): row is [string, string] => row[1] !== null);

  const mapsUrl =
    listing.latitude && listing.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`
      : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-8">
          <Gallery images={listing.images} title={listing.title} />

          {listing.videos.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Video de la propiedad</h2>
              {listing.videos.map((video) => {
                const embed = youtubeEmbedUrl(video.url);
                return embed ? (
                  <div key={video.url} className="aspect-video w-full overflow-hidden rounded-2xl border border-border/40 shadow-sm">
                    <iframe
                      src={embed}
                      title="Video de la propiedad"
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a 
                    key={video.url} 
                    href={video.url} 
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-surface px-4 py-2.5 text-sm font-semibold text-accent hover:text-accent-strong transition-all"
                  >
                    Ver video externo
                  </a>
                );
              })}
            </div>
          )}

          {listing.description && (
            <div className="border-t border-border/40 pt-8">
              <h2 className="mb-3 text-lg font-semibold text-foreground">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{listing.description}</p>
            </div>
          )}

          {characteristics.length > 0 && (
            <div className="border-t border-border/40 pt-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Características</h2>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 rounded-2xl border border-border/60 bg-surface p-6 shadow-sm sm:grid-cols-2">
                {characteristics.map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border/40 py-2.5 text-sm">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-semibold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {listing.services.length > 0 && (
            <div className="border-t border-border/40 pt-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Servicios</h2>
              <ul className="flex flex-wrap gap-2">
                {listing.services.map((service) => (
                  <li 
                    key={service} 
                    className="rounded-xl border border-border/50 bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                  >
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {listing.otherData.length > 0 && (
            <div className="border-t border-border/40 pt-8">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Extras</h2>
              <ul className="flex flex-wrap gap-2">
                {listing.otherData.map((item) => (
                  <li 
                    key={item} 
                    className="rounded-xl border border-border/50 bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <aside className="sticky top-24 h-fit rounded-2xl border border-border/60 bg-surface p-6 shadow-premium flex flex-col gap-5">
            <div>
              <span className="inline-flex rounded-lg bg-accent/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent border border-accent/10">
                {operationLabel(listing.operationType)} · {listing.propertyType}
              </span>
              <h1 className="mt-3 mb-1 text-xl font-bold text-foreground leading-snug">{listing.title}</h1>
              <p className="text-xs text-muted flex items-center gap-1">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/80">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                {[listing.address, listing.city, listing.region].filter(Boolean).join(", ")}
              </p>
            </div>

            <div className="py-2 border-y border-border/40">
              <p className="text-3xl font-extrabold tracking-tight text-accent">{formatPrice(listing)}</p>
            </div>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface/50 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.485 5.25 1.125a.75.75 0 0 1 .504.793v13.5a.75.75 0 0 1-1.023.666l-5.602-1.2-5.602 1.2a.75.75 0 0 1-.943-.33l-4.402-8.802a.75.75 0 0 1 .093-.764l5.25-6.75a.75.75 0 0 1 1.02-.128l5.202 3.902Z" />
                </svg>
                <span>Ver en Google Maps</span>
              </a>
            )}

            <div className="space-y-3 pt-2 text-sm text-foreground">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Datos de Contacto</h3>
              <div className="space-y-2.5">
                {listing.sellerName && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Vendedor</span>
                    <span className="font-semibold">{listing.sellerName}</span>
                  </div>
                )}
                {listing.sellerEmail && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Email</span>
                    <a href={`mailto:${listing.sellerEmail}`} className="font-semibold text-accent hover:underline break-all">
                      {listing.sellerEmail}
                    </a>
                  </div>
                )}
                {listing.agency?.phones && listing.agency.phones.length > 0 && (
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Teléfonos</span>
                    <div className="flex flex-col gap-0.5">
                      {listing.agency.phones.map((phone) => (
                        <span key={phone} className="font-semibold">{phone}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {listing.sourceUpdatedAt && (
              <div className="border-t border-border/40 pt-4 text-center">
                <p className="text-[10px] text-muted uppercase font-bold tracking-wider">
                  Actualizado el {formatDate(listing.sourceUpdatedAt)}
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}


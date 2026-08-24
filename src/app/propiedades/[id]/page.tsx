import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
// TODO(preview): volver a "@/lib/listings" cuando Supabase esté conectado.
import { getListingById } from "@/lib/listings.preview";
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr]">
        <div>
          <Gallery images={listing.images} title={listing.title} />

          {listing.videos.length > 0 && (
            <div className="mt-6 space-y-4">
              {listing.videos.map((video) => {
                const embed = youtubeEmbedUrl(video.url);
                return embed ? (
                  <div key={video.url} className="aspect-video w-full overflow-hidden rounded-xl">
                    <iframe
                      src={embed}
                      title="Video de la propiedad"
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a key={video.url} href={video.url} className="text-sm text-accent hover:underline">
                    Ver video
                  </a>
                );
              })}
            </div>
          )}

          {listing.description && (
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold text-foreground">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{listing.description}</p>
            </div>
          )}

          {characteristics.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-foreground">Características</h2>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 rounded-xl border border-border p-4 sm:grid-cols-2">
                {characteristics.map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border/60 py-1.5 text-sm">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {listing.services.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-foreground">Servicios</h2>
              <ul className="flex flex-wrap gap-2">
                {listing.services.map((service) => (
                  <li key={service} className="rounded-full bg-surface px-3 py-1 text-xs text-foreground">
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {listing.otherData.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-semibold text-foreground">Extras</h2>
              <ul className="flex flex-wrap gap-2">
                {listing.otherData.map((item) => (
                  <li key={item} className="rounded-full bg-surface px-3 py-1 text-xs text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-xl border border-border p-6">
          <span className="text-xs uppercase tracking-wide text-muted">
            {operationLabel(listing.operationType)} · {listing.propertyType}
          </span>
          <h1 className="mt-1 mb-2 text-xl font-semibold text-foreground">{listing.title}</h1>
          <p className="mb-4 text-sm text-muted">
            {[listing.address, listing.city, listing.region].filter(Boolean).join(", ")}
          </p>
          <p className="mb-6 text-2xl font-semibold text-accent">{formatPrice(listing)}</p>

          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-6 block text-sm text-accent hover:underline"
            >
              Ver ubicación en el mapa
            </a>
          )}

          <div className="space-y-1 border-t border-border pt-4 text-sm">
            {listing.sellerName && (
              <p>
                <span className="text-muted">Contacto: </span>
                {listing.sellerName}
              </p>
            )}
            {listing.sellerEmail && (
              <p>
                <span className="text-muted">Email: </span>
                <a href={`mailto:${listing.sellerEmail}`} className="text-accent hover:underline">
                  {listing.sellerEmail}
                </a>
              </p>
            )}
            {listing.agency?.phones.map((phone) => (
              <p key={phone}>
                <span className="text-muted">Tel: </span>
                {phone}
              </p>
            ))}
          </div>

          {listing.sourceUpdatedAt && (
            <p className="mt-6 text-xs text-muted">
              Actualizado el {formatDate(listing.sourceUpdatedAt)}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

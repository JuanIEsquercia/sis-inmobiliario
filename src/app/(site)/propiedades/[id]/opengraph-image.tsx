import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveListingParam } from "@/lib/listings";
import { formatPrice, operationLabel } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

// Imagen de previsualización de UNA propiedad, la que se ve cuando un
// agente comparte el link por WhatsApp, Instagram o Facebook.
//
// Antes esto era la foto cruda del aviso, puesta a mano en
// generateMetadata: sin marca, sin precio, sin código, y con la relación
// de aspecto que viniera del feed — así que cada red la recortaba como
// quería y el link no se veía de la inmobiliaria. Acá se compone a
// 1200x630 (la medida que esperan todas) con la foto, el logo, el precio
// y el código, para que el link llegue con formato institucional.
//
// Usar el archivo en vez de openGraph.images en generateMetadata es lo
// que recomienda la doc de Next, y de paso agrega solo las etiquetas
// og:image:type / width / height, que antes faltaban (varios scrapers
// las piden para no descartar la imagen).
//
// Node runtime para poder leer el logo de public/ con fs, igual que el
// opengraph-image del sitio.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `Propiedad en ${SITE_NAME}`;

const ROJO = "#c52125";
const NEGRO = "#14110f";

// Dos columnas de ancho fijo que suman los 1200 del lienzo. Medidas en
// píxeles y flex en fila, SIN position:absolute: satori (el motor de
// ImageResponse) no aplica el posicionamiento absoluto acá — un hijo
// "absolute" termina maquetado como un hijo de flex normal, así que una
// capa de fondo a pantalla completa no cubre nada.
//
// El ancho de la foto NO es arbitrario. La imagen destacada que manda
// Adinco no es una foto suelta: es la placa de la inmobiliaria (logo,
// "ALQUILA"/"VENDE" y la dirección ya impresos) armada en vertical y
// pegada al medio de un lienzo de 1920x1080 con los costados en BLANCO.
// Se verificó contra el feed real: las 8 destacadas que se revisaron son
// todas 1920x1080 con esa misma estructura, y la placa ocupa ~866 px de
// ancho por los 1080 de alto (relación 0,80).
//
// Con objectFit:"cover" contra una caja de 630 de alto, la foto se
// escala a 0,583 y queda de 1120 de ancho; recortar esa caja a
// 630 x 0,80 = 505 deja ver justo los 866 px del centro, o sea la placa
// entera y nada del blanco. Con 620 (lo que había antes) entraban ~58 px
// de lienzo blanco de cada lado, que se leían como un error de
// maquetado y en realidad venían adentro del JPEG de origen.
const ANCHO_FOTO = 505;
const ANCHO_INFO = size.width - ANCHO_FOTO;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Misma resolución que la ficha, y por el mismo camino: si acá se
  // repitiera la lógica a mano, las dos podrían divergir y el link
  // compartido mostraría una propiedad distinta de la que abre.
  //
  // Solo se dibuja la propiedad si está publicada. Si se dio de baja, o
  // si el link es viejo y habría que redirigir, se cae a la imagen de
  // marca: compartir una propiedad que ya no está con su precio y su
  // foto sería peor que no mostrar nada.
  const r = await resolveListingParam(id);
  const listing = r.estado === "ok" ? r.listing : null;

  const logoData = await readFile(join(process.cwd(), "public", "logo-light.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  if (!listing) {
    // Sin propiedad no hay nada que mostrar, pero devolver una imagen
    // con la marca es mejor que un 404 en el preview.
    return new ImageResponse(
      (
        <div
          style={{
            width: size.width,
            height: size.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) no soporta next/image */}
          <img src={logoSrc} alt="" width={420} height={311} style={{ objectFit: "contain" }} />
        </div>
      ),
      { ...size }
    );
  }

  const foto = listing.images[0]?.url ?? null;
  const precio = formatPrice(listing);
  const operacion = operationLabel(listing.operationType);
  const ubicacion = [listing.address, listing.city].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{ width: size.width, height: size.height, display: "flex" }}>
        {/* Sin foto no se deja la columna vacía: el panel de datos pasa a
            ocupar el lienzo entero, porque una franja negra de 505 px al
            costado se ve como que la imagen no cargó. */}
        {foto ? (
          <div
            style={{
              width: ANCHO_FOTO,
              height: size.height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: NEGRO,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) no soporta next/image */}
            <img
              src={foto}
              alt=""
              width={ANCHO_FOTO}
              height={size.height}
              style={{ width: ANCHO_FOTO, height: size.height, objectFit: "cover" }}
            />
          </div>
        ) : null}

        <div
          style={{
            width: foto ? ANCHO_INFO : size.width,
            height: size.height,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 48px",
            background: NEGRO,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  background: ROJO,
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  padding: "9px 20px",
                  borderRadius: 999,
                }}
              >
                {operacion}
              </div>
              {listing.code && (
                <div
                  style={{
                    display: "flex",
                    border: "2px solid rgba(255,255,255,0.35)",
                    color: "#f5f5f4",
                    fontSize: 22,
                    fontWeight: 700,
                    padding: "7px 18px",
                    borderRadius: 999,
                  }}
                >
                  Código {listing.code}
                </div>
              )}
            </div>

            <div style={{ display: "flex", fontSize: 28, color: "#a8a29e", marginTop: 32 }}>
              {listing.propertyType}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 60,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.05,
                marginTop: 8,
              }}
            >
              {precio}
            </div>
            {ubicacion && (
              <div style={{ display: "flex", fontSize: 26, color: "#d6d3d1", marginTop: 20, lineHeight: 1.3 }}>
                {ubicacion.length > 52 ? `${ubicacion.slice(0, 51)}…` : ubicacion}
              </div>
            )}
          </div>

          {/* Pie de marca: la placa blanca va ajustada al logo
              (alignSelf), no estirada — en un flex en columna el hijo se
              estira a todo el ancho por defecto, y un recuadro blanco de
              600 px se comía la mitad del panel. */}
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                borderRadius: 16,
                padding: "14px 20px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) no soporta next/image */}
              <img src={logoSrc} alt="" width={150} height={111} style={{ objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#a8a29e" }}>
              {SITE_URL.replace(/^https?:\/\//, "")}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

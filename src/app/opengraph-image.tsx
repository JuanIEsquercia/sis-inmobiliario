import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

// Se usa como fallback en toda página del sitio público que no defina
// la suya propia (una ficha de propiedad sí define la suya, con la foto
// real del aviso — ver generateMetadata en propiedades/[id]/page.tsx).
// Node runtime (no edge) porque necesita leer el logo real de public/
// con fs — el patrón que documenta Next para assets locales en estos
// archivos especiales.
export const runtime = "nodejs";
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public", "logo-light.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) no soporta next/image */}
        <img src={logoSrc} alt="" width={420} height={311} style={{ objectFit: "contain" }} />
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#c52125",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {SITE_TAGLINE}
        </div>
        <div style={{ fontSize: 22, color: "#57534e" }}>Venta · Alquiler · Tasaciones · Administración</div>
      </div>
    ),
    { ...size }
  );
}

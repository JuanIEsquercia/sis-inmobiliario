import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";

// Para el carrusel del sitio público — solo las activas, en el orden
// que se definió desde el admin.
export async function getActivePartnerLogos() {
  return withRetry(() =>
    prisma.partnerLogo.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
  );
}

// Para la pantalla de administración — todas, activas o no.
export async function getAllPartnerLogos() {
  return withRetry(() =>
    prisma.partnerLogo.findMany({
      orderBy: { sortOrder: "asc" },
    })
  );
}

// Equipo para el sitio público — un perfil aparece solo si lo marcaron
// explícitamente (showOnPublicSite) Y tiene foto cargada: la marca sin
// foto no alcanza (quedaría una card rota), y la foto sin marca no
// publica a nadie sin que alguien lo decida a propósito.
export async function getPublicTeam() {
  return withRetry(() =>
    prisma.profile.findMany({
      where: { showOnPublicSite: true, photoUrl: { not: null }, isActive: true },
      select: { id: true, firstName: true, lastName: true, phone: true, bio: true, photoUrl: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    })
  );
}

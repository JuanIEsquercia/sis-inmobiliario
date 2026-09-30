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

// Cuándo corrió por última vez el sync del feed de Adinco, para
// mostrarlo en el backoffice. Hace falta que se vea: el sync estuvo 23
// días sin correr (no había cron ni botón, solo un POST a mano) y desde
// el sistema no había ninguna señal de que se hubiera cortado — el sitio
// seguía mostrando propiedades que ya no estaban publicadas en Adinco.
// El "atrasado" se calcula ACÁ y no en el componente: leer la hora
// actual durante el render es una función impura y React lo rechaza
// (regla react-hooks/purity), porque el resultado cambiaría solo entre
// dos renders del mismo árbol.
//
// El umbral es de 36 horas: el cron corre todos los días a las 18:00,
// así que con ese margen una corrida salteada se nota, pero un sync de
// ayer a la tarde no dispara una alarma falsa.
const HORAS_PARA_CONSIDERAR_ATRASADO = 36;

export async function getSyncState() {
  const state = await withRetry(() => prisma.syncState.findUnique({ where: { id: 1 } }));

  const horas = state?.lastSyncedAt ? (Date.now() - state.lastSyncedAt.getTime()) / 36e5 : null;

  return {
    lastSyncedAt: state?.lastSyncedAt ?? null,
    atrasado: horas === null || horas > HORAS_PARA_CONSIDERAR_ATRASADO,
  };
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

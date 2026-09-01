import Image from "next/image";
import { getPublicTeam } from "@/lib/site";
import { toWhatsAppLink } from "@/lib/whatsapp";

// Sin fetch() de por medio (es una consulta directa a Prisma), Next no
// tiene ninguna señal para tratar esta página como dinámica — sin esto
// quedaría prerenderizada en el build y solo se actualizaría con un
// revalidatePath("/equipo") explícito en cada acción de usuarios (ya
// los agregué, pero es tráfico bajo: mejor no depender de acordarse).
export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const team = await getPublicTeam();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground">Nuestro equipo</h1>
      <p className="mb-10 max-w-xl text-muted">
        Conocé a las personas autorizadas a operar dentro de García Propiedades, antes de tu próxima operación.
      </p>

      {team.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay integrantes del equipo publicados.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((person) => (
            <div
              key={person.id}
              className="flex flex-col items-center rounded-2xl border border-border/60 bg-surface p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-premium"
            >
              <Image
                src={person.photoUrl!}
                alt={`${person.firstName ?? ""} ${person.lastName ?? ""}`.trim()}
                width={112}
                height={112}
                unoptimized
                className="mb-4 h-28 w-28 rounded-full border border-border object-cover"
              />
              <h3 className="text-base font-semibold text-foreground">
                {person.firstName} {person.lastName}
              </h3>
              {person.bio && <p className="mt-2 text-sm leading-relaxed text-muted">{person.bio}</p>}
              {person.phone && (
                <a
                  href={toWhatsAppLink(
                    person.phone,
                    `Hola${person.firstName ? ` ${person.firstName}` : ""}, te escribo desde la web de García Propiedades.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.72 14.02c-.24.68-1.4 1.29-1.93 1.35-.5.06-1.06.09-1.71-.11-.4-.12-.9-.29-1.55-.57-2.73-1.18-4.51-3.94-4.65-4.13-.14-.19-1.11-1.47-1.11-2.81 0-1.33.7-1.99.95-2.26.24-.27.53-.34.7-.34.18 0 .35 0 .5.01.16.01.38-.06.59.45.22.53.75 1.83.81 1.96.07.14.11.3.02.48-.09.18-.14.29-.27.45-.14.16-.29.35-.41.47-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.45.12.62-.07.16-.19.7-.81.89-1.09.19-.28.38-.23.63-.14.26.09 1.63.77 1.91.91.28.14.47.21.53.33.07.12.07.68-.17 1.35Z" />
                  </svg>
                  {person.phone}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

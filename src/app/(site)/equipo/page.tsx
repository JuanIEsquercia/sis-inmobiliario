import Image from "next/image";
import { getPublicTeam } from "@/lib/site";

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
        Las personas detrás de García Propiedades — conocelas antes de tu próxima operación.
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
                  href={`tel:${person.phone}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 0 0-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97a1.125 1.125 0 0 0 .417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
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

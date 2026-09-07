import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listClients } from "@/lib/alquileres";
import { SearchField } from "@/components/backoffice/SearchField";
import { KpiStatCard } from "@/components/backoffice/KpiStatCard";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  await requirePermission("clientes.ver");
  const { q } = await searchParams;
  const clients = await listClients(q);

  const clientsWithPhone = clients.filter((c) => Boolean(c.phone)).length;
  const clientsWithEmail = clients.filter((c) => Boolean(c.email)).length;

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Clientes</h1>
          <p className="text-xs text-muted mt-1">Gestión y directorio unificado de clientes, propietarios e inquilinos</p>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiStatCard
          title="Total Clientes"
          value={clients.length}
          subtitle={q ? "Resultados de búsqueda" : "Clientes registrados"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Con Teléfono"
          value={clientsWithPhone}
          subtitle="Contacto telefónico listo"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Con Email"
          value={clientsWithEmail}
          subtitle="Correo registrado"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Buscador */}
      <form className="max-w-xl">
        <SearchField defaultValue={q} placeholder="Buscar cliente por nombre o DNI..." />
      </form>

      {/* Contenedor Adaptativo (Tabla en Desktop, Tarjetas en Móvil) */}
      <ResponsiveDataGrid
        isEmpty={clients.length === 0}
        emptyMessage={q ? "No se encontraron clientes con esa búsqueda." : "Todavía no hay clientes cargados en el sistema."}
        mobileCards={
          <>
            {clients.map((c) => {
              const initials = `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "CL";
              return (
                <div key={c.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold text-sm border border-accent/15">
                        {initials}
                      </div>
                      <div>
                        <Link
                          href={`/backoffice/clientes/${c.id}`}
                          className="font-bold text-foreground hover:text-accent transition-colors text-base"
                        >
                          {c.firstName} {c.lastName}
                        </Link>
                        <p className="text-xs text-muted">DNI / Cuil: <span className="font-medium text-foreground">{c.docId ?? "—"}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {c.phone && (
                      <div className="flex items-center justify-between bg-background/50 p-2.5 rounded-xl border border-border/40">
                        <span className="text-muted font-medium flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Teléfono:
                        </span>
                        <a href={`tel:${c.phone}`} className="font-semibold text-accent hover:underline">
                          {c.phone}
                        </a>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center justify-between bg-background/50 p-2.5 rounded-xl border border-border/40">
                        <span className="text-muted font-medium flex items-center gap-1.5">
                          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email:
                        </span>
                        <a href={`mailto:${c.email}`} className="font-medium text-foreground hover:text-accent truncate max-w-[180px]">
                          {c.email}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/backoffice/clientes/${c.id}`}
                      className="flex h-10 w-full items-center justify-center rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-background transition-colors"
                    >
                      Ver Ficha del Cliente
                    </Link>
                  </div>
                </div>
              );
            })}
          </>
        }
        table={
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-background/30 text-[10px] font-bold uppercase tracking-widest text-muted/80">
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">DNI / CUIT</th>
                <th className="px-5 py-4">Teléfono</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/30 last:border-0 hover:bg-background/40 transition-colors duration-150"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/backoffice/clientes/${c.id}`}
                      className="font-semibold text-foreground hover:text-accent transition-colors"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted font-medium">{c.docId ?? "—"}</td>
                  <td className="px-5 py-4 text-muted font-medium">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="hover:text-accent hover:underline">
                        {c.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted/80 font-medium">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:text-accent hover:underline">
                        {c.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/backoffice/clientes/${c.id}`}
                      className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface hover:text-foreground transition-colors"
                    >
                      Ver Detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />
    </div>
  );
}

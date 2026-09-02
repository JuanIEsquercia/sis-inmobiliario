import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listClients } from "@/lib/alquileres";
import { SearchField } from "@/components/backoffice/SearchField";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  await requirePermission("clientes.ver");
  const { q } = await searchParams;
  const clients = await listClients(q);

  return (
    <div>
      <h1 className="mb-8 text-xl font-bold tracking-tight text-foreground uppercase">Clientes</h1>

      <form className="mb-6 max-w-md">
        <SearchField defaultValue={q} placeholder="Buscar por nombre o DNI..." />
      </form>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface p-12 text-center">
          <p className="text-sm text-muted">
            {q ? "No se encontraron clientes con esa búsqueda." : "Todavía no hay clientes cargados en el sistema."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-surface shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-background/30 text-[10px] font-bold uppercase tracking-widest text-muted/80">
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">DNI</th>
                <th className="px-5 py-4">Teléfono</th>
                <th className="px-5 py-4">Email</th>
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
                  <td className="px-5 py-4 text-muted font-medium">{c.phone ?? "—"}</td>
                  <td className="px-5 py-4 text-muted/80 font-medium">{c.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


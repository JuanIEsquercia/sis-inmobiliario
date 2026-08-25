import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listClients } from "@/lib/alquileres";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  await requirePermission("clientes.ver");
  const { q } = await searchParams;
  const clients = await listClients(q);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">Clientes</h1>

      <form className="mb-6">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre o DNI..."
          className="field max-w-sm"
        />
      </form>

      {clients.length === 0 ? (
        <p className="text-sm text-muted">
          {q ? "No se encontraron clientes con esa búsqueda." : "Todavía no hay clientes cargados."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/clientes/${c.id}`} className="font-medium text-foreground hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.docId ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{c.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

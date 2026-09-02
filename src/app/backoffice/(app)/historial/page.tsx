import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getUnits } from "@/lib/alquileres";
import { SearchField } from "@/components/backoffice/SearchField";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function HistorialPage({ searchParams }: PageProps) {
  await requirePermission("historial.ver");
  const { q } = await searchParams;
  const units = await getUnits(q);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Historial de propiedades</h1>
      <p className="mb-6 text-sm text-muted">
        Trazabilidad por unidad — contratos, ventas y tasaciones a lo largo del tiempo, tenga o no una operación
        vigente hoy.
      </p>

      <form className="mb-6 max-w-md">
        <SearchField defaultValue={q} placeholder="Buscar por código, dirección o localidad..." />
      </form>

      {units.length === 0 ? (
        <p className="text-sm text-muted">
          {q ? "No se encontraron propiedades con esa búsqueda." : "Todavía no hay propiedades cargadas."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Contratos</th>
                <th className="px-4 py-3">Ventas</th>
                <th className="px-4 py-3">Tasaciones</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{u.propertyCode}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/historial/${u.id}`} className="font-medium text-foreground hover:underline">
                      {u.address}
                    </Link>
                    {u.city && <span className="ml-1.5 text-muted">· {u.city}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{u._count.contracts}</td>
                  <td className="px-4 py-3 text-muted">{u._count.sales}</td>
                  <td className="px-4 py-3 text-muted">{u._count.appraisals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

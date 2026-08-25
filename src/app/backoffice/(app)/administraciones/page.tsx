import Link from "next/link";
import { getContracts } from "@/lib/alquileres";
import { requirePermission } from "@/lib/auth";
import { AdministracionesTabs } from "@/components/backoffice/AdministracionesTabs";

const statusLabels: Record<string, string> = {
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
};

export default async function AdministracionesPage() {
  const profile = await requirePermission("administraciones.ver");
  const contracts = await getContracts();

  return (
    <div>
      <AdministracionesTabs active="contratos" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Contratos</h1>
        {profile.permissions.includes("administraciones.crear") && (
          <Link
            href="/backoffice/administraciones/nuevo"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Nuevo contrato
          </Link>
        )}
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay contratos cargados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Inquilino</th>
                <th className="px-4 py-3">Propietario</th>
                <th className="px-4 py-3">Alquiler</th>
                <th className="px-4 py-3">Próx. actualización</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{c.unit.propertyCode}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/administraciones/${c.id}`} className="font-medium text-foreground hover:underline">
                      {c.unit.address}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.tenant.firstName} {c.tenant.lastName}</td>
                  <td className="px-4 py-3 text-muted">{c.owner.firstName} {c.owner.lastName}</td>
                  <td className="px-4 py-3 text-foreground">
                    {c.currency} {c.rentAmount.toString()}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.nextIndexationDueAt
                      ? new Intl.DateTimeFormat("es-AR").format(c.nextIndexationDueAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{statusLabels[c.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

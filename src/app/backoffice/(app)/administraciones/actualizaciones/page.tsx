import Link from "next/link";
import { getContractsDueForIndexation } from "@/lib/alquileres";
import { requirePermission } from "@/lib/auth";
import { AdministracionesTabs } from "@/components/backoffice/AdministracionesTabs";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

// Diferencia en días de calendario (no horas exactas) — una actualización
// que vence "hoy" siempre muestra 0, nunca un número negativo.
function daysUntil(date: Date): number {
  const now = new Date();
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.max(0, Math.round((target - startOfToday) / (1000 * 60 * 60 * 24)));
}

export default async function ActualizacionesPage() {
  await requirePermission("administraciones.ver");
  const contracts = await getContractsDueForIndexation(30);

  return (
    <div>
      <AdministracionesTabs active="actualizaciones" />
      <h1 className="mb-2 text-xl font-semibold text-foreground">Actualizaciones</h1>
      <p className="mb-6 text-sm text-muted">Contratos que actualizan el alquiler en los próximos 30 días.</p>

      {contracts.length === 0 ? (
        <p className="text-sm text-muted">No hay actualizaciones pendientes en los próximos 30 días.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Inquilino</th>
                <th className="px-4 py-3">Alquiler actual</th>
                <th className="px-4 py-3">Índice</th>
                <th className="px-4 py-3">Actualiza el</th>
                <th className="px-4 py-3">Faltan</th>
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
                  <td className="px-4 py-3 text-muted">
                    {c.tenant.firstName} {c.tenant.lastName}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {c.currency} {c.rentAmount.toString()}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.indexType?.code ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{fmtDate.format(c.nextIndexationDueAt!)}</td>
                  <td className="px-4 py-3 text-foreground">{daysUntil(c.nextIndexationDueAt!)} días</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getAppraisals } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default async function TasacionesPage() {
  const profile = await requirePermission("caja.ver");
  const appraisals = await getAppraisals();

  return (
    <div>
      <CajaTabs active="tasaciones" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Tasaciones</h1>
        {profile.permissions.includes("caja.tasaciones.crear") && (
          <Link
            href="/backoffice/caja/tasaciones/nueva"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Nueva tasación
          </Link>
        )}
      </div>

      {appraisals.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay tasaciones cargadas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Propiedad</th>
                <th className="px-4 py-3">Tasador</th>
                <th className="px-4 py-3">Monto</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{fmtDate.format(a.completedAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/caja/tasaciones/${a.id}`} className="font-medium text-foreground hover:underline">
                      {a.unit.propertyCode} — {a.unit.address}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {a.agent.firstName} {a.agent.lastName}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {a.currency} {fmtMoney(Number(a.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

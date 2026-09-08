import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getAppraisals } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { SearchField } from "@/components/backoffice/SearchField";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function TasacionesPage({ searchParams }: PageProps) {
  const profile = await requirePermission("caja.ver");
  const { q } = await searchParams;
  const appraisals = await getAppraisals(q);

  return (
    <div className="space-y-6">
      <CajaTabs active="tasaciones" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Tasaciones</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed max-w-3xl">
            Registro y seguimiento de tasaciones comerciales y residenciales. El cobro se confirma en la ficha de cada una.
          </p>
        </div>
        {profile.permissions.includes("caja.tasaciones.crear") && (
          <Link
            href="/backoffice/caja/tasaciones/nueva"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent-strong hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm shadow-accent/10 shrink-0"
          >
            Nueva tasación
          </Link>
        )}
      </div>

      <form className="max-w-xl">
        <SearchField defaultValue={q} placeholder="Buscar por código o dirección..." />
      </form>

      <ResponsiveDataGrid
        isEmpty={appraisals.length === 0}
        emptyMessage={q ? "No se encontraron tasaciones con esa búsqueda." : "Todavía no hay tasaciones cargadas."}
        mobileCards={
          <>
            {appraisals.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2.5">
                  <div>
                    <span className="font-mono text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-lg">
                      {a.unit.propertyCode}
                    </span>
                    <Link
                      href={`/backoffice/caja/tasaciones/${a.id}`}
                      className="font-bold text-foreground hover:text-accent transition-colors text-base block mt-1"
                    >
                      {a.unit.address}
                    </Link>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      a.cashMovement
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {a.cashMovement ? "✓ Cobrada" : "Pendiente"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Reparto</span>
                    <span className="font-semibold text-foreground truncate block">
                      {a.vendedorAgent ? `50/50 — ${a.vendedorAgent.firstName}` : "100% Inmobiliaria"}
                    </span>
                  </div>
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Monto</span>
                    <span className="font-extrabold text-foreground">
                      {a.currency} {fmtMoney(Number(a.amount))}
                    </span>
                  </div>
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40 col-span-2">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Fecha Realización</span>
                    <span className="font-semibold text-foreground">{fmtDate.format(a.completedAt)}</span>
                  </div>
                </div>

                <div>
                  <Link
                    href={`/backoffice/caja/tasaciones/${a.id}`}
                    className="flex h-10 w-full items-center justify-center rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-background transition-colors"
                  >
                    Ver Ficha de Tasación
                  </Link>
                </div>
              </div>
            ))}
          </>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Propiedad</th>
                <th className="px-4 py-3">Reparto</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3 text-right">Cobro</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted font-medium">{fmtDate.format(a.completedAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/caja/tasaciones/${a.id}`} className="font-semibold text-foreground hover:underline">
                      {a.unit.propertyCode} — {a.unit.address}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted font-medium">
                    {a.vendedorAgent ? `50/50 — ${a.vendedorAgent.firstName} ${a.vendedorAgent.lastName}` : "100% inmobiliaria"}
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">
                    {a.currency} {fmtMoney(Number(a.amount))}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-muted">
                    {a.cashMovement ? "✓ Cobrada" : "Pendiente"}
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

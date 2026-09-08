import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getSales, agentLabel } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { SearchField } from "@/components/backoffice/SearchField";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function VentasPage({ searchParams }: PageProps) {
  const profile = await requirePermission("caja.ver");
  const { q } = await searchParams;
  const sales = await getSales(q);

  return (
    <div className="space-y-6">
      <CajaTabs active="ventas" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Ventas Inmobiliarias</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed max-w-3xl">
            Gestión de operaciones de venta cerradas, comisiones y división entre agentes captadores y vendedores.
          </p>
        </div>
        {profile.permissions.includes("caja.ventas.crear") && (
          <Link
            href="/backoffice/caja/ventas/nueva"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent-strong hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm shadow-accent/10 shrink-0"
          >
            Nueva venta
          </Link>
        )}
      </div>

      <form className="max-w-xl">
        <SearchField defaultValue={q} placeholder="Buscar por propiedad, vendedor o comprador..." />
      </form>

      <ResponsiveDataGrid
        isEmpty={sales.length === 0}
        emptyMessage={q ? "No se encontraron ventas con esa búsqueda." : "Todavía no hay ventas cargadas."}
        mobileCards={
          <>
            {sales.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2.5">
                  <div>
                    <span className="font-mono text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-lg">
                      {s.unit.propertyCode}
                    </span>
                    <Link
                      href={`/backoffice/caja/ventas/${s.id}`}
                      className="font-bold text-foreground hover:text-accent transition-colors text-base block mt-1"
                    >
                      {s.unit.address}
                    </Link>
                  </div>
                  <span className="text-xs font-semibold text-muted bg-background px-2.5 py-1 rounded-lg border border-border shrink-0">
                    {fmtDate.format(s.closedAt)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Vendedor</span>
                    <span className="font-semibold text-foreground truncate block">{agentLabel(s.vendedorAgent)}</span>
                  </div>
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Captador</span>
                    <span className="font-semibold text-foreground truncate block">{agentLabel(s.captadorAgent)}</span>
                  </div>
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40 col-span-2">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Comisión Acordada</span>
                    <span className="font-extrabold text-foreground text-sm">
                      {s.currency} {fmtMoney(Number(s.commissionAmount))}
                    </span>
                  </div>
                </div>

                <div>
                  <Link
                    href={`/backoffice/caja/ventas/${s.id}`}
                    className="flex h-10 w-full items-center justify-center rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-background transition-colors"
                  >
                    Ver Detalle de Venta
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
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Captador</th>
                <th className="px-4 py-3 text-right">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted font-medium">{fmtDate.format(s.closedAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/caja/ventas/${s.id}`} className="font-semibold text-foreground hover:underline">
                      {s.unit.propertyCode} — {s.unit.address}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted font-medium">{agentLabel(s.vendedorAgent)}</td>
                  <td className="px-4 py-3 text-muted font-medium">{agentLabel(s.captadorAgent)}</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    {s.currency} {fmtMoney(Number(s.commissionAmount))}
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

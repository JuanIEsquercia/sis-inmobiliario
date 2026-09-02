import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getBudgets, creatorLabel, budgetItemsTotal, itemsByRecipient } from "@/lib/presupuestos";
import { PresupuestosTabs } from "@/components/backoffice/PresupuestosTabs";
import { SearchField } from "@/components/backoffice/SearchField";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";
import { eliminarPresupuesto } from "./actions";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const typeLabels: Record<string, string> = {
  ALQUILER: "Alquiler",
  VENTA: "Venta",
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PresupuestosPage({ searchParams }: PageProps) {
  const profile = await requirePermission("presupuestos.ver");
  const { q } = await searchParams;
  const budgets = await getBudgets(q);
  const canManageConceptos = profile.permissions.includes("presupuestos.conceptos.gestionar");
  const canManage = profile.permissions.includes("presupuestos.crear");

  return (
    <div>
      <PresupuestosTabs active="presupuestos" showConceptos={canManageConceptos} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Presupuestos</h1>
        {profile.permissions.includes("presupuestos.crear") && (
          <Link
            href="/backoffice/presupuestos/nuevo"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Nuevo presupuesto
          </Link>
        )}
      </div>

      <form className="mb-6 max-w-md">
        <SearchField defaultValue={q} placeholder="Buscar por propiedad o parte..." />
      </form>

      {budgets.length === 0 ? (
        <p className="text-sm text-muted">
          {q ? "No se encontraron presupuestos con esa búsqueda." : "Todavía no hay presupuestos cargados."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Propiedad</th>
                <th className="px-4 py-3">Partes</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Hecho por</th>
                {canManage && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const isVenta = b.type === "VENTA";
                const compradorTotal = isVenta ? budgetItemsTotal(itemsByRecipient(b.items, "COMPRADOR")) : null;
                const propietarioTotal = isVenta ? budgetItemsTotal(itemsByRecipient(b.items, "PROPIETARIO")) : null;
                return (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 text-muted">{fmtDate.format(b.createdAt)}</td>
                    <td className="px-4 py-3 text-muted">{typeLabels[b.type]}</td>
                    <td className="px-4 py-3">
                      <Link href={`/backoffice/presupuestos/${b.id}`} className="font-medium text-foreground hover:underline">
                        {b.unitDetail}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {isVenta
                        ? `Comprador: ${b.buyerName ?? "—"} · Propietario: ${b.ownerName ?? "—"}`
                        : `Inquilino: ${b.tenantName ?? "—"}`}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {isVenta ? (
                        <span className="flex flex-col text-xs">
                          <span>Comprador: {b.currency} {fmtMoney(compradorTotal ?? 0)}</span>
                          <span>Propietario: {b.currency} {fmtMoney(propietarioTotal ?? 0)}</span>
                        </span>
                      ) : (
                        `${b.currency} ${fmtMoney(budgetItemsTotal(b.items))}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{creatorLabel(b.createdBy)}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <ConfirmDeleteButton
                          action={eliminarPresupuesto.bind(null, b.id)}
                          triggerClassName="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:bg-surface hover:text-foreground cursor-pointer"
                          title="¿Eliminar este presupuesto?"
                          description={`Se va a borrar "${b.unitDetail}" y todos sus conceptos cargados. Esta acción no se puede deshacer.`}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

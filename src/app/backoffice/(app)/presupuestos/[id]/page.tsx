import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getBudgetById, creatorLabel, budgetTotalsByCurrency, itemsByRecipient } from "@/lib/presupuestos";
import { eliminarPresupuesto } from "../actions";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PresupuestoDetailPage({ params }: PageProps) {
  const profile = await requirePermission("presupuestos.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const budget = await getBudgetById(numericId);
  if (!budget) notFound();

  const canManage = profile.permissions.includes("presupuestos.crear");
  const isVenta = budget.type === "VENTA";

  return (
    <div className="max-w-5xl">
      <Link href="/backoffice/presupuestos" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
        ← Volver a presupuestos
      </Link>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{budget.unitDetail}</h1>
          <p className="text-xs text-muted mt-1">
            Presupuesto de {isVenta ? "Venta" : "Alquiler"} · {fmtDate.format(budget.createdAt)} · Creado por{" "}
            <span className="font-semibold text-foreground">{creatorLabel(budget.createdBy)}</span>
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-none">
            <Link
              href={`/backoffice/presupuestos/${budget.id}/editar`}
              className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors"
            >
              Editar
            </Link>
            <ConfirmDeleteButton
              action={eliminarPresupuesto.bind(null, budget.id)}
              triggerClassName="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
              title="¿Eliminar este presupuesto?"
              description={`Se va a borrar "${budget.unitDetail}" y todos sus conceptos cargados. Esta acción no se puede deshacer.`}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {budget.observations && (
          <div className="rounded-2xl border border-accent/30 bg-accent-soft/10 p-5 text-sm text-foreground">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-accent mb-2">
              Observaciones (Impresas en el presupuesto)
            </span>
            <p className="leading-relaxed whitespace-pre-line font-medium">{budget.observations}</p>
          </div>
        )}

        {budget.notes && (
          <div className="rounded-2xl border border-border bg-surface/30 p-5 text-sm text-muted">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted/70 mb-2">
              Notas internas (Solo backoffice)
            </span>
            <p className="leading-relaxed whitespace-pre-line">{budget.notes}</p>
          </div>
        )}
      </div>

      {isVenta ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <RecipientCard
            title="Comprador"
            name={budget.buyerName}
            items={itemsByRecipient(budget.items, "COMPRADOR")}
            printHref={`/backoffice/presupuestos/${budget.id}/imprimir?para=comprador`}
          />
          <RecipientCard
            title="Propietario"
            name={budget.ownerName}
            items={itemsByRecipient(budget.items, "PROPIETARIO")}
            printHref={`/backoffice/presupuestos/${budget.id}/imprimir?para=propietario`}
          />
        </div>
      ) : (
        <RecipientCard
          title="Inquilino"
          name={budget.tenantName}
          items={itemsByRecipient(budget.items, "INQUILINO")}
          printHref={`/backoffice/presupuestos/${budget.id}/imprimir?para=inquilino`}
        />
      )}
    </div>
  );
}

function RecipientCard({
  title,
  name,
  items,
  printHref,
}: {
  title: string;
  name: string | null;
  items: { id: number; description: string; amount: unknown; currency: string }[];
  printHref: string;
}) {
  const totals = budgetTotalsByCurrency(items);
  return (
    <div className="rounded-2xl border border-border bg-surface/30 p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="mb-5 flex items-center justify-between pb-3 border-b border-border/50">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h2>
            <p className="text-base text-foreground font-bold mt-0.5">{name ?? "A completar"}</p>
          </div>
          <Link
            href={printHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors shadow-xs"
          >
            <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted py-4">Sin conceptos cargados.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="py-2 pr-4">Concepto</th>
                  <th className="py-2 pl-4 text-right w-36">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 text-foreground font-medium leading-relaxed break-words">
                      {item.description}
                    </td>
                    <td className="py-3 pl-4 text-right font-bold text-foreground flex-none whitespace-nowrap align-top">
                      {item.currency} {fmtMoney(Number(item.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-4 bg-background/50 rounded-xl p-4">
        {totals.length === 0 ? (
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-bold text-accent">—</span>
          </div>
        ) : (
          totals.map((t) => (
            <div key={t.currency} className="flex items-center justify-between text-sm">
              <span className="font-bold text-foreground">
                Total {totals.length > 1 ? `(${t.currency})` : ""}
              </span>
              <span className="text-base font-extrabold text-accent">
                {t.currency} {fmtMoney(t.total)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


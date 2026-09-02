import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getBudgetById, creatorLabel, budgetItemsTotal, itemsByRecipient } from "@/lib/presupuestos";
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
    <div className="max-w-3xl">
      <Link href="/backoffice/presupuestos" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Presupuestos
      </Link>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">{budget.unitDetail}</h1>
          <p className="text-xs text-muted mt-1">
            Presupuesto de {isVenta ? "Venta" : "Alquiler"} · {fmtDate.format(budget.createdAt)} · Hecho por{" "}
            {creatorLabel(budget.createdBy)}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Link
              href={`/backoffice/presupuestos/${budget.id}/editar`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface hover:text-foreground"
            >
              Editar
            </Link>
            <ConfirmDeleteButton
              action={eliminarPresupuesto.bind(null, budget.id)}
              triggerClassName="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface hover:text-foreground cursor-pointer"
              title="¿Eliminar este presupuesto?"
              description={`Se va a borrar "${budget.unitDetail}" y todos sus conceptos cargados. Esta acción no se puede deshacer.`}
            />
          </div>
        )}
      </div>

      {budget.notes && (
        <div className="mb-6 rounded-xl border border-border bg-surface/30 p-4 text-sm text-muted">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted/70 mb-1">Notas internas</span>
          {budget.notes}
        </div>
      )}

      {isVenta ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <RecipientCard
            title="Comprador"
            name={budget.buyerName}
            items={itemsByRecipient(budget.items, "COMPRADOR")}
            currency={budget.currency}
            printHref={`/backoffice/presupuestos/${budget.id}/imprimir?para=comprador`}
          />
          <RecipientCard
            title="Propietario"
            name={budget.ownerName}
            items={itemsByRecipient(budget.items, "PROPIETARIO")}
            currency={budget.currency}
            printHref={`/backoffice/presupuestos/${budget.id}/imprimir?para=propietario`}
          />
        </div>
      ) : (
        <RecipientCard
          title="Inquilino"
          name={budget.tenantName}
          items={itemsByRecipient(budget.items, "INQUILINO")}
          currency={budget.currency}
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
  currency,
  printHref,
}: {
  title: string;
  name: string | null;
  items: { id: number; description: string; amount: unknown }[];
  currency: string;
  printHref: string;
}) {
  const total = budgetItemsTotal(items);
  return (
    <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>
          <p className="text-sm text-foreground font-semibold">{name ?? "A completar"}</p>
        </div>
        <Link
          href={printHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-surface"
        >
          Imprimir
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">Sin conceptos cargados.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm mb-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
              <span className="text-foreground">{item.description}</span>
              <span className="font-semibold text-foreground flex-none">{fmtMoney(Number(item.amount))}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 font-semibold">
        <span className="text-foreground">Total</span>
        <span className="text-accent">
          {currency} {fmtMoney(total)}
        </span>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getBudgetById, itemsByRecipient } from "@/lib/presupuestos";
import { actualizarPresupuesto } from "../../actions";
import { BudgetItemsSection } from "@/components/backoffice/BudgetItemsSection";

interface PageProps {
  params: Promise<{ id: string }>;
}

function toRow(item: { description: string; amount: unknown; currency: string }) {
  return { description: item.description, amount: String(item.amount), currency: item.currency };
}

export default async function EditarPresupuestoPage({ params }: PageProps) {
  await requirePermission("presupuestos.crear");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const budget = await getBudgetById(numericId);
  if (!budget) notFound();

  const isVenta = budget.type === "VENTA";

  return (
    <div className="max-w-6xl">
      <Link href={`/backoffice/presupuestos/${budget.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
        ← Volver al presupuesto
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Editar presupuesto de {isVenta ? "Venta" : "Alquiler"}
      </h1>

      <form action={actualizarPresupuesto.bind(null, budget.id)} className="flex flex-col gap-6">
        <input type="hidden" name="type" value={budget.type} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <fieldset className="md:col-span-2 rounded-2xl border border-border/80 bg-surface/30 p-5 flex flex-col gap-3">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Propiedad</legend>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unitDetail" className="text-xs font-semibold text-foreground">
                Código y/o dirección de la propiedad *
              </label>
              <input id="unitDetail" name="unitDetail" required defaultValue={budget.unitDetail} className="field text-sm font-medium" />
              <p className="text-[11px] text-muted">
                Texto libre — no requiere que la propiedad esté cargada previamente en el sistema.
              </p>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-border/80 bg-surface/30 p-5 flex flex-col gap-3">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">
              {isVenta ? "Partes intervinientes" : "Inquilino"}
            </legend>
            {isVenta ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="buyerName" className="text-xs font-semibold text-foreground">
                    Comprador
                  </label>
                  <input id="buyerName" name="buyerName" defaultValue={budget.buyerName ?? ""} placeholder="Opcional" className="field text-sm font-medium" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ownerName" className="text-xs font-semibold text-foreground">
                    Propietario
                  </label>
                  <input id="ownerName" name="ownerName" defaultValue={budget.ownerName ?? ""} placeholder="Opcional" className="field text-sm font-medium" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tenantName" className="text-xs font-semibold text-foreground">
                  Inquilino
                </label>
                <input id="tenantName" name="tenantName" defaultValue={budget.tenantName ?? ""} placeholder="Opcional" className="field text-sm font-medium" />
              </div>
            )}
          </fieldset>
        </div>

        <BudgetItemsSection
          type={budget.type}
          initialCurrency={budget.currency}
          alquilerItems={isVenta ? undefined : itemsByRecipient(budget.items, "INQUILINO").map(toRow)}
          compradorItems={isVenta ? itemsByRecipient(budget.items, "COMPRADOR").map(toRow) : undefined}
          propietarioItems={isVenta ? itemsByRecipient(budget.items, "PROPIETARIO").map(toRow) : undefined}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-surface/30 p-5">
            <label htmlFor="observations" className="text-xs font-bold uppercase tracking-wider text-muted">
              Observaciones (Impresas en el presupuesto)
            </label>
            <textarea
              id="observations"
              name="observations"
              rows={3}
              defaultValue={budget.observations ?? ""}
              placeholder="Salen impresas en el presupuesto..."
              className="field text-sm leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-surface/30 p-5">
            <label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted">
              Notas internas (Solo visibles en backoffice)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={budget.notes ?? ""}
              placeholder="No se imprimen, son solo para uso interno"
              className="field text-sm leading-relaxed"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-strong transition-colors cursor-pointer shadow-sm"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}


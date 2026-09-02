import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getBudgetById, itemsByRecipient } from "@/lib/presupuestos";
import { actualizarPresupuesto } from "../../actions";
import { BudgetItemsFields } from "@/components/backoffice/BudgetItemsFields";

interface PageProps {
  params: Promise<{ id: string }>;
}

function toRow(item: { description: string; amount: unknown }) {
  return { description: item.description, amount: String(item.amount) };
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
    <div className="max-w-3xl">
      <Link href={`/backoffice/presupuestos/${budget.id}`} className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Volver al presupuesto
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Editar presupuesto de {isVenta ? "Venta" : "Alquiler"}
      </h1>

      <form action={actualizarPresupuesto.bind(null, budget.id)} className="flex flex-col gap-6">
        <input type="hidden" name="type" value={budget.type} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Propiedad</legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unitDetail" className="text-xs text-muted">
              Código y/o dirección *
            </label>
            <input id="unitDetail" name="unitDetail" required defaultValue={budget.unitDetail} className="field" />
            <p className="text-[11px] text-muted/80">
              Texto libre — no hace falta que la propiedad esté cargada como unidad en el sistema.
            </p>
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
            {isVenta ? "Partes" : "Inquilino"}
          </legend>
          {isVenta ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="buyerName" className="text-xs text-muted">
                  Nombre del comprador
                </label>
                <input id="buyerName" name="buyerName" defaultValue={budget.buyerName ?? ""} placeholder="Opcional" className="field" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ownerName" className="text-xs text-muted">
                  Nombre del propietario
                </label>
                <input id="ownerName" name="ownerName" defaultValue={budget.ownerName ?? ""} placeholder="Opcional" className="field" />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tenantName" className="text-xs text-muted">
                Nombre del inquilino
              </label>
              <input id="tenantName" name="tenantName" defaultValue={budget.tenantName ?? ""} placeholder="Opcional" className="field" />
            </div>
          )}
        </fieldset>

        <div className="flex flex-col gap-1.5 w-40">
          <label htmlFor="currency" className="text-xs text-muted">
            Moneda
          </label>
          <select id="currency" name="currency" defaultValue={budget.currency} className="field">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>

        {isVenta ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BudgetItemsFields
              namePrefix="itemsComprador"
              label="Conceptos — Comprador"
              initialItems={itemsByRecipient(budget.items, "COMPRADOR").map(toRow)}
            />
            <BudgetItemsFields
              namePrefix="itemsPropietario"
              label="Conceptos — Propietario"
              initialItems={itemsByRecipient(budget.items, "PROPIETARIO").map(toRow)}
            />
          </div>
        ) : (
          <BudgetItemsFields
            namePrefix="items"
            label="Conceptos — Inquilino"
            initialItems={itemsByRecipient(budget.items, "INQUILINO").map(toRow)}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas internas
          </label>
          <textarea id="notes" name="notes" rows={2} defaultValue={budget.notes ?? ""} placeholder="No se imprimen, son solo para uso interno" className="field" />
        </div>

        <button
          type="submit"
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}

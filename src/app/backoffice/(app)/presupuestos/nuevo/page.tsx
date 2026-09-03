import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { crearPresupuesto } from "../actions";
import { BudgetItemsFields } from "@/components/backoffice/BudgetItemsFields";

interface PageProps {
  searchParams: Promise<{ tipo?: string }>;
}

export default async function NuevoPresupuestoPage({ searchParams }: PageProps) {
  await requirePermission("presupuestos.crear");
  const { tipo } = await searchParams;
  const type = tipo === "ALQUILER" || tipo === "VENTA" ? tipo : null;

  if (!type) {
    return (
      <div className="max-w-2xl">
        <h1 className="mb-1 text-xl font-semibold text-foreground">Nuevo presupuesto</h1>
        <p className="mb-6 text-sm text-muted">Elegí qué tipo de presupuesto vas a armar.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/backoffice/presupuestos/nuevo?tipo=ALQUILER"
            className="rounded-2xl border border-border/80 bg-surface/40 p-6 text-left hover:border-accent hover:bg-accent-soft/20 transition-colors"
          >
            <h2 className="mb-1 text-base font-bold text-foreground">Alquiler</h2>
            <p className="text-xs text-muted">Genera un único presupuesto, para el inquilino.</p>
          </Link>
          <Link
            href="/backoffice/presupuestos/nuevo?tipo=VENTA"
            className="rounded-2xl border border-border/80 bg-surface/40 p-6 text-left hover:border-accent hover:bg-accent-soft/20 transition-colors"
          >
            <h2 className="mb-1 text-base font-bold text-foreground">Venta</h2>
            <p className="text-xs text-muted">Genera dos presupuestos independientes: uno para el comprador y otro para el propietario.</p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/backoffice/presupuestos/nuevo" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Elegir otro tipo
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        Nuevo presupuesto de {type === "ALQUILER" ? "Alquiler" : "Venta"}
      </h1>

      <form action={crearPresupuesto} className="flex flex-col gap-6">
        <input type="hidden" name="type" value={type} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Propiedad</legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unitDetail" className="text-xs text-muted">
              Código y/o dirección *
            </label>
            <input
              id="unitDetail"
              name="unitDetail"
              required
              placeholder="Ej. Código 166 — José Ramón Vidal 1768"
              className="field"
            />
            <p className="text-[11px] text-muted/80">
              Texto libre — no hace falta que la propiedad esté cargada como unidad en el sistema.
            </p>
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
            {type === "ALQUILER" ? "Inquilino" : "Partes"}
          </legend>
          {type === "ALQUILER" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tenantName" className="text-xs text-muted">
                Nombre del inquilino
              </label>
              <input id="tenantName" name="tenantName" placeholder="Opcional" className="field" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="buyerName" className="text-xs text-muted">
                  Nombre del comprador
                </label>
                <input id="buyerName" name="buyerName" placeholder="Opcional" className="field" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ownerName" className="text-xs text-muted">
                  Nombre del propietario
                </label>
                <input id="ownerName" name="ownerName" placeholder="Opcional" className="field" />
              </div>
            </>
          )}
        </fieldset>

        <div className="flex flex-col gap-1.5 w-40">
          <label htmlFor="currency" className="text-xs text-muted">
            Moneda
          </label>
          <select id="currency" name="currency" defaultValue="ARS" className="field">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>

        {type === "ALQUILER" ? (
          <BudgetItemsFields namePrefix="items" label="Conceptos — Inquilino" />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BudgetItemsFields namePrefix="itemsComprador" label="Conceptos — Comprador" />
            <BudgetItemsFields namePrefix="itemsPropietario" label="Conceptos — Propietario" />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="observations" className="text-sm font-medium text-foreground">
            Observaciones
          </label>
          <textarea
            id="observations"
            name="observations"
            rows={2}
            placeholder="Salen impresas en el presupuesto — ej. &quot;Precio sujeto a confirmación&quot;, &quot;Incluye gastos de escritura&quot;, &quot;Válido por 15 días&quot;"
            className="field"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas internas
          </label>
          <textarea id="notes" name="notes" rows={2} placeholder="No se imprimen, son solo para uso interno" className="field" />
        </div>

        <button
          type="submit"
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
        >
          Generar presupuesto
        </button>
      </form>
    </div>
  );
}

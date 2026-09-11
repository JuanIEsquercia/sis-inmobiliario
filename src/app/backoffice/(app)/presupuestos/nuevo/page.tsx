import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { crearPresupuesto } from "../actions";
import { BudgetItemsSection } from "@/components/backoffice/BudgetItemsSection";

interface PageProps {
  searchParams: Promise<{ tipo?: string }>;
}

export default async function NuevoPresupuestoPage({ searchParams }: PageProps) {
  await requirePermission("presupuestos.crear");
  const { tipo } = await searchParams;
  const type = tipo === "ALQUILER" || tipo === "VENTA" ? tipo : null;

  if (!type) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-1 text-xl font-bold text-foreground">Nuevo presupuesto</h1>
        <p className="mb-6 text-sm text-muted">Elegí qué tipo de presupuesto vas a armar.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/backoffice/presupuestos/nuevo?tipo=ALQUILER"
            className="rounded-2xl border border-border/80 bg-surface/40 p-6 text-left hover:border-accent hover:bg-accent-soft/20 transition-colors group shadow-xs"
          >
            <h2 className="mb-1 text-base font-bold text-foreground group-hover:text-accent transition-colors">Alquiler</h2>
            <p className="text-xs text-muted">Genera un único presupuesto, enfocado en el inquilino.</p>
          </Link>
          <Link
            href="/backoffice/presupuestos/nuevo?tipo=VENTA"
            className="rounded-2xl border border-border/80 bg-surface/40 p-6 text-left hover:border-accent hover:bg-accent-soft/20 transition-colors group shadow-xs"
          >
            <h2 className="mb-1 text-base font-bold text-foreground group-hover:text-accent transition-colors">Venta</h2>
            <p className="text-xs text-muted">Genera dos presupuestos independientes: uno para el comprador y otro para el propietario.</p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <Link href="/backoffice/presupuestos/nuevo" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
        ← Elegir otro tipo
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Nuevo presupuesto de {type === "ALQUILER" ? "Alquiler" : "Venta"}
      </h1>

      <form action={crearPresupuesto} className="flex flex-col gap-6">
        <input type="hidden" name="type" value={type} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <fieldset className="md:col-span-2 rounded-2xl border border-border/80 bg-surface/30 p-5 flex flex-col gap-3">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Propiedad</legend>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="unitDetail" className="text-xs font-semibold text-foreground">
                Código y/o dirección de la propiedad *
              </label>
              <input
                id="unitDetail"
                name="unitDetail"
                required
                placeholder="Ej. Código 166 — José Ramón Vidal 1768"
                className="field text-sm font-medium"
              />
              <p className="text-[11px] text-muted">
                Texto libre — no requiere que la propiedad esté cargada previamente en el sistema.
              </p>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-border/80 bg-surface/30 p-5 flex flex-col gap-3">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">
              {type === "ALQUILER" ? "Inquilino" : "Partes intervinientes"}
            </legend>
            {type === "ALQUILER" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tenantName" className="text-xs font-semibold text-foreground">
                  Nombre del inquilino
                </label>
                <input id="tenantName" name="tenantName" placeholder="Opcional" className="field text-sm font-medium" />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="buyerName" className="text-xs font-semibold text-foreground">
                    Comprador
                  </label>
                  <input id="buyerName" name="buyerName" placeholder="Opcional" className="field text-sm font-medium" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ownerName" className="text-xs font-semibold text-foreground">
                    Propietario
                  </label>
                  <input id="ownerName" name="ownerName" placeholder="Opcional" className="field text-sm font-medium" />
                </div>
              </div>
            )}
          </fieldset>
        </div>

        <BudgetItemsSection type={type} initialCurrency="ARS" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-surface/30 p-5">
            <label htmlFor="observations" className="text-xs font-bold uppercase tracking-wider text-muted">
              Observaciones (Impresas en el presupuesto)
            </label>
            <textarea
              id="observations"
              name="observations"
              rows={3}
              placeholder="Ej. &quot;Valores sujetos a confirmación por 15 días&quot;, &quot;Incluye honorarios de escritura&quot;..."
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
              placeholder="Comentarios confidenciales del equipo o aclaraciones internas..."
              className="field text-sm leading-relaxed"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-strong transition-colors cursor-pointer shadow-sm"
          >
            Generar presupuesto
          </button>
        </div>
      </form>
    </div>
  );
}


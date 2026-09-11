import { requirePermission } from "@/lib/auth";
import { getBudgetConcepts } from "@/lib/presupuestos";
import { PresupuestosTabs } from "@/components/backoffice/PresupuestosTabs";
import { SearchField } from "@/components/backoffice/SearchField";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";
import { crearConcepto, actualizarConcepto, eliminarConcepto } from "../actions";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function ConceptosPage({ searchParams }: PageProps) {
  await requirePermission("presupuestos.conceptos.gestionar");
  const { q } = await searchParams;
  const concepts = await getBudgetConcepts(q);

  return (
    <div className="max-w-5xl">
      <PresupuestosTabs active="conceptos" />
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de conceptos predeterminados</h1>
          <p className="text-sm text-muted mt-1">
            Lista de sugerencias frecuentemente utilizadas al cargar un ítem de presupuesto.
          </p>
        </div>
      </div>

      <form action={crearConcepto} className="mb-8 rounded-2xl border border-dashed border-border bg-surface/30 p-5 flex flex-col gap-3 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">
          + Agregar nuevo concepto al catálogo
        </span>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex flex-col gap-1.5 flex-1 w-full">
            <label htmlFor="new-name" className="text-xs font-semibold text-foreground">
              Nombre / Descripción del concepto *
            </label>
            <input
              id="new-name"
              name="name"
              required
              placeholder="Ej. Honorarios de redacción y certificación de contrato de locación"
              className="field w-full text-sm font-medium"
            />
          </div>
          <div className="flex flex-col gap-1.5 w-full sm:w-44">
            <label htmlFor="new-amount" className="text-xs font-semibold text-foreground">
              Precio sugerido (ARS/USD)
            </label>
            <input
              id="new-amount"
              name="defaultAmount"
              type="number"
              step="0.01"
              placeholder="Opcional"
              className="field w-full text-right font-semibold"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-strong transition-colors cursor-pointer w-full sm:w-auto flex-none shadow-xs"
          >
            Guardar en catálogo
          </button>
        </div>
      </form>

      <div className="mb-6 flex items-center justify-between gap-4">
        <form className="w-full max-w-md">
          <SearchField defaultValue={q} placeholder="Buscar por concepto en catálogo..." />
        </form>
        <span className="text-xs text-muted flex-none">
          {concepts.length} {concepts.length === 1 ? "concepto guardado" : "conceptos guardados"}
        </span>
      </div>

      {concepts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/20 p-8 text-center text-sm text-muted">
          {q ? "No se encontraron conceptos con esa búsqueda." : "Todavía no hay conceptos guardados en el catálogo."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {concepts.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-surface/30 p-4 shadow-xs hover:border-border/80 transition-colors">
              <form action={actualizarConcepto.bind(null, c.id)} className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <label htmlFor={`name-${c.id}`} className="sr-only">
                    Nombre del concepto
                  </label>
                  <input
                    id={`name-${c.id}`}
                    name="name"
                    defaultValue={c.name}
                    required
                    className="field w-full text-sm font-semibold text-foreground"
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <div className="w-36">
                    <label htmlFor={`amount-${c.id}`} className="sr-only">
                      Precio sugerido
                    </label>
                    <input
                      id={`amount-${c.id}`}
                      name="defaultAmount"
                      type="number"
                      step="0.01"
                      defaultValue={c.defaultAmount?.toString() ?? ""}
                      placeholder="Sin precio"
                      className="field w-full text-right font-medium text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-surface transition-colors"
                  >
                    Guardar
                  </button>
                  <ConfirmDeleteButton
                    action={eliminarConcepto.bind(null, c.id)}
                    triggerClassName="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                    title="¿Eliminar este concepto?"
                    description={`"${c.name}" va a dejar de sugerirse al cargar presupuestos. Los presupuestos que ya lo usaron no se ven afectados.`}
                  />
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


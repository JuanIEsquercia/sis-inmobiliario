import { requirePermission } from "@/lib/auth";
import { getBudgetConcepts } from "@/lib/presupuestos";
import { PresupuestosTabs } from "@/components/backoffice/PresupuestosTabs";
import { SearchField } from "@/components/backoffice/SearchField";
import { crearConcepto, actualizarConcepto, eliminarConcepto } from "../actions";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

// Catálogo administrable de conceptos (ver comentario en el modelo
// BudgetConcept) — CRUD simple sin versionado: editar acá cambia el
// registro en el momento, no afecta a ningún presupuesto ya guardado
// (BudgetItem siempre copia su propio texto/monto al cargarse).
export default async function ConceptosPage({ searchParams }: PageProps) {
  await requirePermission("presupuestos.conceptos.gestionar");
  const { q } = await searchParams;
  const concepts = await getBudgetConcepts(q);

  return (
    <div className="max-w-2xl">
      <PresupuestosTabs active="conceptos" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Catálogo de conceptos</h1>
      <p className="mb-6 text-sm text-muted">
        Se sugieren al cargar un ítem de presupuesto — elegir uno completa concepto y precio, editable igual antes de guardar.
      </p>

      <form action={crearConcepto} className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border p-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[10rem]">
          <label htmlFor="new-name" className="text-xs text-muted">
            Concepto *
          </label>
          <input id="new-name" name="name" required placeholder="Ej. Sellado de contrato" className="field w-full" />
        </div>
        <div className="flex flex-col gap-1.5 w-40">
          <label htmlFor="new-amount" className="text-xs text-muted">
            Precio sugerido
          </label>
          <input id="new-amount" name="defaultAmount" type="number" step="0.01" placeholder="Opcional" className="field w-full" />
        </div>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong">
          Agregar
        </button>
      </form>

      <form className="mb-6 max-w-md">
        <SearchField defaultValue={q} placeholder="Buscar concepto..." />
      </form>

      {concepts.length === 0 ? (
        <p className="text-sm text-muted">
          {q ? "No se encontraron conceptos con esa búsqueda." : "Todavía no hay conceptos guardados."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {concepts.map((c) => (
            <div key={c.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4">
              <form action={actualizarConcepto.bind(null, c.id)} className="flex flex-1 flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[10rem]">
                  <label htmlFor={`name-${c.id}`} className="text-xs text-muted">
                    Concepto
                  </label>
                  <input id={`name-${c.id}`} name="name" defaultValue={c.name} required className="field w-full" />
                </div>
                <div className="flex flex-col gap-1.5 w-40">
                  <label htmlFor={`amount-${c.id}`} className="text-xs text-muted">
                    Precio sugerido
                  </label>
                  <input
                    id={`amount-${c.id}`}
                    name="defaultAmount"
                    type="number"
                    step="0.01"
                    defaultValue={c.defaultAmount?.toString() ?? ""}
                    placeholder="Opcional"
                    className="field w-full"
                  />
                </div>
                <button type="submit" className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-surface">
                  Guardar
                </button>
              </form>
              <form action={eliminarConcepto.bind(null, c.id)}>
                <button type="submit" className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-surface hover:text-foreground">
                  Eliminar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

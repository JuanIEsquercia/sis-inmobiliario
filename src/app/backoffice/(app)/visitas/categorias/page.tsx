import { requirePermission } from "@/lib/auth";
import { getCategoriasResultado } from "@/lib/visitas";
import { ActionForm } from "@/components/backoffice/ActionForm";
import { SubmitButton } from "@/components/backoffice/SubmitButton";
import { actualizarCategoria, crearCategoria, moverCategoria } from "../actions";

const botonChico = "rounded border border-border px-2 py-1 text-xs hover:bg-surface cursor-pointer disabled:opacity-30";

// Lista de resultados posibles de una visita (para perfilar el lead). Se
// desactivan en vez de borrarse, para no perder el resultado de las
// visitas viejas.
export default async function CategoriasPage() {
  await requirePermission("visitas.categorias");
  const categorias = await getCategoriasResultado(false);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Categorías de resultado</h1>
      <p className="mb-6 text-sm text-muted">
        Lo que elige el vendedor al marcar una visita como hecha. El orden es el de la lista que ve el vendedor.
      </p>

      <ActionForm action={crearCategoria} mensajeExito="Categoría agregada" className="mb-6 flex gap-2">
        <input name="name" required placeholder="Nueva categoría (ej. Pide financiación)" className="field flex-1" />
        <SubmitButton className="rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground cursor-pointer">Agregar</SubmitButton>
      </ActionForm>

      <ul className="flex flex-col gap-2">
        {categorias.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
            <div className="flex gap-1">
              <ActionForm action={moverCategoria.bind(null, c.id, "antes")} mensajeExito="Orden actualizado">
                <button type="submit" disabled={i === 0} className={botonChico} aria-label="Subir">↑</button>
              </ActionForm>
              <ActionForm action={moverCategoria.bind(null, c.id, "despues")} mensajeExito="Orden actualizado">
                <button type="submit" disabled={i === categorias.length - 1} className={botonChico} aria-label="Bajar">↓</button>
              </ActionForm>
            </div>
            <ActionForm action={actualizarCategoria.bind(null, c.id)} mensajeExito="Categoría guardada" className="flex flex-1 flex-wrap items-center gap-2">
              <input name="name" required defaultValue={c.name} className="field flex-1 min-w-48" />
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" name="isActive" defaultChecked={c.isActive} /> Activa
              </label>
              <span className="text-xs text-muted">{c._count.visits} visita(s)</span>
              <SubmitButton className={botonChico}>Guardar</SubmitButton>
            </ActionForm>
          </li>
        ))}
      </ul>
    </div>
  );
}

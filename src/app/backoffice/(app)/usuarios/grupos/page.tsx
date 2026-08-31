import { requirePermission } from "@/lib/auth";
import { getContractGroups } from "@/lib/alquileres";
import { getAgents } from "@/lib/caja";
import { UsuariosTabs } from "@/components/backoffice/UsuariosTabs";
import { crearGrupoContratos, actualizarMiembrosGrupo } from "../actions";

export default async function GruposPage() {
  await requirePermission("administraciones.grupos.gestionar");
  const [groups, agents] = await Promise.all([getContractGroups(), getAgents()]);

  return (
    <div>
      <UsuariosTabs active="grupos" showGrupos />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Grupos de contratos</h1>
      <p className="mb-6 text-sm text-muted">
        Carteras operativas — quién ve y gestiona qué. Un contrato sin grupo asignado solo lo ve alguien con el
        permiso &quot;Ver contratos de todos los grupos&quot;. Los contratos se asignan a un grupo seleccionándolos
        desde el listado de Contratos.
      </p>

      <div className="mb-8 flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g.id} className="rounded-xl border border-border p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{g.name}</h2>
                {g.description && <p className="text-sm text-muted">{g.description}</p>}
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                {g._count.contracts} contrato{g._count.contracts === 1 ? "" : "s"}
              </span>
            </div>

            <form action={actualizarMiembrosGrupo.bind(null, g.id)} className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted">Miembros (ven y gestionan los contratos de este grupo)</p>
              <div className="flex flex-wrap gap-2">
                {agents.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      name="memberIds"
                      value={a.id}
                      defaultChecked={g.members.some((m) => m.profile.id === a.id)}
                      className="h-3.5 w-3.5 accent-accent"
                    />
                    {a.lastName} {a.firstName} (@{a.username})
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="w-fit rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
              >
                Guardar miembros
              </button>
            </form>
          </section>
        ))}

        {groups.length === 0 && <p className="text-sm text-muted">Todavía no hay grupos creados.</p>}
      </div>

      <section className="rounded-xl border border-dashed border-border p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Crear grupo nuevo</h2>
        <form action={crearGrupoContratos} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs text-muted">
              Nombre*
            </label>
            <input id="name" name="name" required className="field" placeholder="Cartera María Paz" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-xs text-muted">
              Descripción
            </label>
            <input id="description" name="description" className="field w-72" placeholder="Opcional" />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Crear grupo
          </button>
        </form>
      </section>
    </div>
  );
}

import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getContractGroups } from "@/lib/alquileres";
import { getAgents } from "@/lib/caja";
import { UsuariosTabs } from "@/components/backoffice/UsuariosTabs";
import { FormWithFeedback } from "@/components/backoffice/FormWithFeedback";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";
import {
  crearGrupoContratos,
  actualizarGrupoContratos,
  actualizarMiembrosGrupo,
  eliminarGrupoContratos,
} from "../actions";

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
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{g.name}</h2>
                {g.description && <p className="text-sm text-muted">{g.description}</p>}
                <p className="mt-1 text-xs text-muted/80">
                  {g.members.length === 0
                    ? "Sin miembros asignados"
                    : `${g.members.length} miembro${g.members.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                {g._count.contracts > 0 ? (
                  <Link
                    href="/backoffice/administraciones"
                    className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
                  >
                    {g._count.contracts} contrato{g._count.contracts === 1 ? "" : "s"}
                  </Link>
                ) : (
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                    Sin contratos
                  </span>
                )}
                {/* Borrar el grupo no toca los contratos: la FK está en
                    ON DELETE SET NULL, así que quedan "sin grupo". El
                    texto lo dice explícitamente porque, visto de afuera,
                    "eliminar un grupo de contratos" suena a que se lleva
                    los contratos con él. */}
                <ConfirmDeleteButton
                  action={eliminarGrupoContratos.bind(null, g.id)}
                  triggerLabel="Eliminar grupo"
                  triggerClassName="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                  title={`¿Eliminar el grupo "${g.name}"?`}
                  description={
                    g._count.contracts > 0
                      ? `Los ${g._count.contracts} contrato${g._count.contracts === 1 ? "" : "s"} de esta cartera NO se borran: quedan sin grupo asignado, visibles solo para quien tenga "ver contratos de todos los grupos". Después podés reasignarlos desde el listado de Contratos.`
                      : "Este grupo no tiene contratos asignados. Se borra el grupo y los accesos de sus miembros."
                  }
                  confirmLabel="Sí, eliminar grupo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Datos del grupo — antes no se podían editar: el nombre
                  quedaba fijo desde la creación. */}
              <FormWithFeedback
                action={actualizarGrupoContratos.bind(null, g.id)}
                submitLabel="Guardar datos"
                className="flex flex-col gap-3"
              >
                <p className="text-xs font-medium text-muted">Datos del grupo</p>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`name-${g.id}`} className="text-xs text-muted">
                    Nombre*
                  </label>
                  <input id={`name-${g.id}`} name="name" required defaultValue={g.name} className="field text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`description-${g.id}`} className="text-xs text-muted">
                    Descripción
                  </label>
                  <input
                    id={`description-${g.id}`}
                    name="description"
                    defaultValue={g.description ?? ""}
                    placeholder="Opcional"
                    className="field text-sm"
                  />
                </div>
              </FormWithFeedback>

              <FormWithFeedback
                action={actualizarMiembrosGrupo.bind(null, g.id)}
                submitLabel="Guardar miembros"
                className="flex flex-col gap-3"
              >
                <p className="text-xs font-medium text-muted">
                  Miembros (ven y gestionan los contratos de este grupo)
                </p>
                <div className="flex flex-wrap gap-2">
                  {agents.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground cursor-pointer hover:bg-surface transition-colors"
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
              </FormWithFeedback>
            </div>
          </section>
        ))}

        {groups.length === 0 && <p className="text-sm text-muted">Todavía no hay grupos creados.</p>}
      </div>

      <section className="rounded-xl border border-dashed border-border p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Crear grupo nuevo</h2>
        <FormWithFeedback
          action={crearGrupoContratos}
          submitLabel="Crear grupo"
          pendingLabel="Creando..."
          className="flex flex-wrap items-end gap-3"
          submitClassName="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
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
        </FormWithFeedback>
      </section>
    </div>
  );
}

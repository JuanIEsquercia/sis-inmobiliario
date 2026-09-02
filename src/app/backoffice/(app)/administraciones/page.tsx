import Link from "next/link";
import { getContracts, getContractGroups, clientLabel } from "@/lib/alquileres";
import { requirePermission, getContractGroupScope } from "@/lib/auth";
import { AdministracionesTabs } from "@/components/backoffice/AdministracionesTabs";
import { SelectAllCheckbox } from "@/components/backoffice/SelectAllCheckbox";
import { SearchField } from "@/components/backoffice/SearchField";
import { asignarContratosAGrupo, finalizarContrato } from "./actions";

const statusLabels: Record<string, string> = {
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
  ANULADO: "Anulado",
};

const BULK_FORM_ID = "asignar-grupo-form";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdministracionesPage({ searchParams }: PageProps) {
  const profile = await requirePermission("administraciones.ver");
  const scope = await getContractGroupScope(profile);
  const { q } = await searchParams;
  const canManageGroups = profile.permissions.includes("administraciones.grupos.gestionar");
  const canFinalizar = profile.permissions.includes("administraciones.crear");
  const [contracts, groups] = await Promise.all([
    getContracts(scope, q),
    canManageGroups ? getContractGroups() : Promise.resolve([]),
  ]);

  return (
    <div>
      <AdministracionesTabs active="contratos" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Contratos</h1>
        {profile.permissions.includes("administraciones.crear") && (
          <Link
            href="/backoffice/administraciones/nuevo"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Nuevo contrato
          </Link>
        )}
      </div>

      <form className="mb-7 max-w-xl">
        <SearchField defaultValue={q} placeholder="Buscar por código, dirección, inquilino o propietario..." />
      </form>

      {contracts.length === 0 ? (
        <p className="text-sm text-muted">
          {q ? "No se encontraron contratos con esa búsqueda." : "Todavía no hay contratos cargados."}
        </p>
      ) : (
        <>
          {/* Form "vacío": los checkboxes de cada fila viven en la tabla
              de más abajo y se asocian acá vía el atributo form= — así
              conviven con el form de finalizar/rescindir que sí está
              anidado dentro de cada fila, sin un <form> adentro de otro. */}
          {canManageGroups && (
            <form
              action={asignarContratosAGrupo}
              id={BULK_FORM_ID}
              className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted"
            >
              <SelectAllCheckbox formId={BULK_FORM_ID} />
              Seleccionar todos
              {groups.length === 0 ? (
                <span>
                  — todavía no hay grupos.{" "}
                  <Link href="/backoffice/usuarios/grupos" className="text-accent hover:underline">
                    Crear uno
                  </Link>
                </span>
              ) : (
                <>
                  <select name="groupId" defaultValue="" className="field w-auto py-1.5 text-xs">
                    <option value="">— Sin grupo —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface">
                    Asignar a grupo
                  </button>
                </>
              )}
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  {canManageGroups && <th className="px-4 py-3" />}
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Inquilino</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Alquiler</th>
                  <th className="px-4 py-3">Administra</th>
                  <th className="px-4 py-3">Próx. actualización</th>
                  <th className="px-4 py-3">Estado</th>
                  {canManageGroups && <th className="px-4 py-3">Grupo</th>}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                    {canManageGroups && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          form={BULK_FORM_ID}
                          name="contractIds"
                          value={c.id}
                          className="h-3.5 w-3.5 accent-accent"
                          aria-label={`Seleccionar contrato ${c.unit.propertyCode}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-muted">{c.unit.propertyCode}</td>
                    <td className="px-4 py-3">
                      <Link href={`/backoffice/administraciones/${c.id}`} className="font-medium text-foreground hover:underline">
                        {c.unit.address}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{clientLabel(c.tenant)}</td>
                    <td className="px-4 py-3 text-muted">{clientLabel(c.owner)}</td>
                    <td className="px-4 py-3 text-foreground">
                      {c.currency} {c.rentAmount.toString()}
                    </td>
                    <td className="px-4 py-3 text-muted">{c.isAdministered ? "Sí" : "No"}</td>
                    <td className="px-4 py-3 text-muted">
                      {c.nextIndexationDueAt
                        ? new Intl.DateTimeFormat("es-AR").format(c.nextIndexationDueAt)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {canFinalizar && c.status === "ACTIVO" ? (
                        <form
                          action={finalizarContrato.bind(null, c.id)}
                          className="flex items-center gap-1.5"
                        >
                          <select
                            name="status"
                            defaultValue="FINALIZADO"
                            className="field w-auto py-1 text-xs"
                            aria-label={`Estado para ${c.unit.propertyCode}`}
                          >
                            <option value="FINALIZADO">Finalizar</option>
                            <option value="RESCINDIDO">Rescindir</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface"
                          >
                            Aplicar
                          </button>
                        </form>
                      ) : (
                        statusLabels[c.status]
                      )}
                    </td>
                    {canManageGroups && (
                      <td className="px-4 py-3 text-muted">{c.group?.name ?? "—"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

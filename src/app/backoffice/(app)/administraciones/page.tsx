import Link from "next/link";
import { getContracts, getContractGroups, clientLabel } from "@/lib/alquileres";
import { requirePermission, getContractGroupScope } from "@/lib/auth";
import { AdministracionesTabs } from "@/components/backoffice/AdministracionesTabs";
import { SelectAllCheckbox } from "@/components/backoffice/SelectAllCheckbox";
import { SearchField } from "@/components/backoffice/SearchField";
import { KpiStatCard } from "@/components/backoffice/KpiStatCard";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
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

  // Métricas
  const totalActivos = contracts.filter((c) => c.status === "ACTIVO").length;
  const conIndexacionPendiente = contracts.filter((c) => c.status === "ACTIVO" && c.nextIndexationDueAt).length;

  return (
    <div className="space-y-6">
      <AdministracionesTabs active="contratos" />

      {/* Header & Botón Crear */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Gestión de Contratos</h1>
          <p className="text-xs text-muted mt-1">Administración de contratos vigentes, grupos e indexaciones de alquiler</p>
        </div>
        {profile.permissions.includes("administraciones.crear") && (
          <Link
            href="/backoffice/administraciones/nuevo"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent-strong hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm shadow-accent/10 shrink-0"
          >
            Nuevo contrato
          </Link>
        )}
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiStatCard
          title="Total Contratos"
          value={contracts.length}
          subtitle={q ? "Resultados de búsqueda" : "Registrados en el sistema"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Contratos Activos"
          value={totalActivos}
          subtitle="En vigencia actual"
          badge={{ label: "Activos", variant: "success" }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Próx. Actualizaciones"
          value={conIndexacionPendiente}
          subtitle="Con fecha programada"
          badge={{ label: "Indexables", variant: "accent" }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Buscador */}
      <form className="max-w-xl">
        <SearchField defaultValue={q} placeholder="Buscar por código, dirección, inquilino o propietario..." />
      </form>

      {/* Formulario de Asignación en Lote */}
      {canManageGroups && contracts.length > 0 && (
        <form
          action={asignarContratosAGrupo}
          id={BULK_FORM_ID}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-3.5 text-xs text-muted shadow-xs"
        >
          <div className="flex items-center gap-2 font-medium text-foreground">
            <SelectAllCheckbox formId={BULK_FORM_ID} />
            <span>Seleccionar todos</span>
          </div>

          {groups.length === 0 ? (
            <span>
              — todavía no hay grupos.{" "}
              <Link href="/backoffice/usuarios/grupos" className="text-accent font-semibold hover:underline">
                Crear uno
              </Link>
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select name="groupId" defaultValue="" className="field w-full sm:w-auto py-1.5 text-xs">
                <option value="">— Sin grupo —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-8 px-4 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground hover:bg-background cursor-pointer shadow-xs"
              >
                Asignar a grupo
              </button>
            </div>
          )}
        </form>
      )}

      {/* Grid Adaptativo (Tarjetas Móviles + Tabla Desktop) */}
      <ResponsiveDataGrid
        isEmpty={contracts.length === 0}
        emptyMessage={q ? "No se encontraron contratos con esa búsqueda." : "Todavía no hay contratos cargados."}
        mobileCards={
          <>
            {contracts.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2.5">
                    {canManageGroups && (
                      <input
                        type="checkbox"
                        form={BULK_FORM_ID}
                        name="contractIds"
                        value={c.id}
                        className="h-4 w-4 accent-accent rounded"
                        aria-label={`Seleccionar contrato ${c.unit.propertyCode}`}
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-lg">
                          {c.unit.propertyCode}
                        </span>
                        {c.group && (
                          <span className="text-[10px] font-bold text-muted bg-background border border-border px-2 py-0.5 rounded-lg">
                            {c.group.name}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/backoffice/administraciones/${c.id}`}
                        className="font-bold text-foreground hover:text-accent transition-colors text-base block mt-1"
                      >
                        {c.unit.address}
                      </Link>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      c.status === "ACTIVO"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-muted/10 text-muted border-border/50"
                    }`}
                  >
                    {statusLabels[c.status] ?? c.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Inquilino</span>
                    <span className="font-semibold text-foreground truncate block">{clientLabel(c.tenant)}</span>
                  </div>
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Propietario</span>
                    <span className="font-semibold text-foreground truncate block">{clientLabel(c.owner)}</span>
                  </div>
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Alquiler</span>
                    <span className="font-bold text-foreground">
                      {c.currency} {c.rentAmount.toString()}
                    </span>
                  </div>
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Próx. Act.</span>
                    <span className="font-semibold text-foreground">
                      {c.nextIndexationDueAt
                        ? new Intl.DateTimeFormat("es-AR").format(c.nextIndexationDueAt)
                        : "—"}
                    </span>
                  </div>
                </div>

                {canFinalizar && c.status === "ACTIVO" && (
                  <form action={finalizarContrato.bind(null, c.id)} className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <select
                      name="status"
                      defaultValue="FINALIZADO"
                      className="field flex-1 py-1.5 text-xs"
                      aria-label={`Estado para ${c.unit.propertyCode}`}
                    >
                      <option value="FINALIZADO">Finalizar Contrato</option>
                      <option value="RESCINDIDO">Rescindir Contrato</option>
                    </select>
                    <button
                      type="submit"
                      className="h-9 px-4 rounded-xl bg-accent text-xs font-bold text-accent-foreground hover:bg-accent-strong transition-colors cursor-pointer shrink-0"
                    >
                      Aplicar
                    </button>
                  </form>
                )}

                <div>
                  <Link
                    href={`/backoffice/administraciones/${c.id}`}
                    className="flex h-10 w-full items-center justify-center rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-background transition-colors"
                  >
                    Ver Ficha de Contrato
                  </Link>
                </div>
              </div>
            ))}
          </>
        }
        table={
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
                  <td className="px-4 py-3 font-mono font-medium text-accent">{c.unit.propertyCode}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/administraciones/${c.id}`} className="font-semibold text-foreground hover:underline">
                      {c.unit.address}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{clientLabel(c.tenant)}</td>
                  <td className="px-4 py-3 text-muted">{clientLabel(c.owner)}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
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
                      <form action={finalizarContrato.bind(null, c.id)} className="flex items-center gap-1.5">
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
                          className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface cursor-pointer"
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
        }
      />
    </div>
  );
}

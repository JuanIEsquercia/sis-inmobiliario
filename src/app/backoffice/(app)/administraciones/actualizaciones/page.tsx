import Link from "next/link";
import { getContractsDueForIndexation, getContractsNearingEnd, getIndexTypes, clientLabel } from "@/lib/alquileres";
import { requirePermission, getContractGroupScope } from "@/lib/auth";
import { AdministracionesTabs } from "@/components/backoffice/AdministracionesTabs";
import { IndexacionPercentField } from "@/components/backoffice/IndexacionPercentField";
import { RentCalculatorEmbed } from "@/components/backoffice/RentCalculatorEmbed";
import { actualizarRenovacionEsperada, aplicarIndexacion } from "../actions";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

// Diferencia en días de calendario (no horas exactas) — puede dar
// negativo (ya venció y sigue sin aplicarse), a propósito: es la señal
// de "atrasada" que antes esta lista perdía silenciosamente.
function daysUntil(date: Date): number {
  const now = new Date();
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((target - startOfToday) / (1000 * 60 * 60 * 24));
}

export default async function ActualizacionesPage() {
  const profile = await requirePermission("administraciones.ver");
  const canEdit = profile.permissions.includes("administraciones.crear");
  const canIndexar = profile.permissions.includes("administraciones.indexacion");
  const scope = await getContractGroupScope(profile);
  const [contracts, nearingEnd, indexTypes] = await Promise.all([
    getContractsDueForIndexation(scope, 30),
    getContractsNearingEnd(scope, 60),
    getIndexTypes(),
  ]);

  return (
    <div>
      <AdministracionesTabs active="actualizaciones" />
      <h1 className="mb-2 text-xl font-semibold text-foreground">Actualizaciones</h1>
      <p className="mb-6 text-sm text-muted">
        Contratos que actualizan el alquiler en los próximos 30 días — las ya vencidas y sin aplicar quedan arriba,
        marcadas como atrasadas, hasta que se apliquen.
      </p>

      {contracts.length === 0 ? (
        <p className="text-sm text-muted">No hay actualizaciones pendientes en los próximos 30 días.</p>
      ) : (
        <div className="mb-10 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Inquilino</th>
                <th className="px-4 py-3">Alquiler actual</th>
                <th className="px-4 py-3">Índice</th>
                <th className="px-4 py-3">Actualiza el</th>
                {canIndexar && <th className="px-4 py-3">Aplicar actualización</th>}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const days = daysUntil(c.nextIndexationDueAt!);
                const isOverdue = days < 0;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 text-muted">{c.unit.propertyCode}</td>
                    <td className="px-4 py-3">
                      <Link href={`/backoffice/administraciones/${c.id}`} className="font-medium text-foreground hover:underline">
                        {c.unit.address}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{clientLabel(c.tenant)}</td>
                    <td className="px-4 py-3 text-foreground">
                      {c.currency} {c.rentAmount.toString()}
                    </td>
                    <td className="px-4 py-3 text-muted">{c.indexType?.code ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-muted">{fmtDate.format(c.nextIndexationDueAt!)}</span>
                      {isOverdue ? (
                        <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                          Atrasada {Math.abs(days)}d
                        </span>
                      ) : (
                        <span className="ml-2 text-[10px] text-muted/70">({days === 0 ? "hoy" : `en ${days}d`})</span>
                      )}
                    </td>
                    {canIndexar && (
                      <td className="px-4 py-3">
                        <form
                          action={aplicarIndexacion.bind(null, c.id)}
                          className="flex flex-wrap items-center gap-1.5"
                        >
                          <IndexacionPercentField
                            currentAmount={Number(c.rentAmount)}
                            currency={c.currency}
                            compact
                            ariaLabel={`% de actualización para ${c.unit.propertyCode}`}
                          />
                          <select
                            name="indexTypeId"
                            defaultValue={c.indexTypeId ?? ""}
                            className="field w-24 py-1 text-xs"
                            aria-label={`Índice para ${c.unit.propertyCode}`}
                          >
                            <option value="">Sin índice</option>
                            {indexTypes.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.code}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground hover:bg-accent-strong">
                            Aplicar
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-2 text-lg font-semibold text-foreground">Contratos por vencer</h2>
      <p className="mb-4 text-sm text-muted">
        Vencimiento en los próximos 60 días — momento natural para decidir si la renovación va a cobrar comisión.
      </p>

      {nearingEnd.length === 0 ? (
        <p className="text-sm text-muted">No hay contratos por vencer en los próximos 60 días.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Inquilino</th>
                <th className="px-4 py-3">Vence el</th>
                <th className="px-4 py-3">Faltan</th>
                <th className="px-4 py-3">¿Cobra comisión al renovar?</th>
              </tr>
            </thead>
            <tbody>
              {nearingEnd.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{c.unit.propertyCode}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/administraciones/${c.id}`} className="font-medium text-foreground hover:underline">
                      {c.unit.address}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{clientLabel(c.tenant)}</td>
                  <td className="px-4 py-3 text-muted">{fmtDate.format(c.endDate)}</td>
                  <td className="px-4 py-3 text-foreground">{daysUntil(c.endDate)} días</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <form action={actualizarRenovacionEsperada.bind(null, c.id)} className="flex items-center gap-1.5">
                        <select
                          name="renewalCommissionExpected"
                          defaultValue={
                            c.renewalCommissionExpected === true ? "true" : c.renewalCommissionExpected === false ? "false" : ""
                          }
                          className="field py-1 text-xs"
                        >
                          <option value="">A confirmar</option>
                          <option value="true">Sí</option>
                          <option value="false">No</option>
                        </select>
                        <button type="submit" className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface">
                          Guardar
                        </button>
                      </form>
                    ) : (
                      <span className="text-muted">
                        {c.renewalCommissionExpected === true ? "Sí" : c.renewalCommissionExpected === false ? "No" : "A confirmar"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculadora de arquiler.com, embebida acá para tenerla a mano
          sin salir del sistema (no calcula nada del sistema en sí, es
          un servicio externo). Tema y color de fondo siguen el modo
          claro/oscuro del panel — ver RentCalculatorEmbed. El
          overflow-x-auto es un resguardo puntual: si el contenido de
          adentro del iframe no llega a achicarse del todo en pantallas
          angostas, que scrollee esta tarjeta nada más, no la página
          entera (el fix real es min-w-0 en <main>, ver BackofficeShell). */}
      <div className="mt-10 rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Calculadora de actualización</h2>
        <p className="mb-4 text-xs text-muted">Vía arquiler.com.</p>
        <div className="overflow-x-auto">
          <RentCalculatorEmbed />
        </div>
      </div>
    </div>
  );
}

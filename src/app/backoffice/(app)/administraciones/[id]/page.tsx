import Link from "next/link";
import { notFound } from "next/navigation";
import { getContractById, getContractGroups, paymentTotal } from "@/lib/alquileres";
import { getAgents, getActiveCommissionScheme, agentLabel, toRepartoSchemeInfo } from "@/lib/caja";
import { getSignedDocumentUrl } from "@/lib/supabase/storage";
import { requirePermission, getContractGroupScope } from "@/lib/auth";
import {
  subirDocumento,
  finalizarContrato,
  actualizarAgentesContrato,
  actualizarPartesContrato,
  anularContrato,
  eliminarContratoDefinitivo,
  marcarContratoFirmado,
  asignarGrupoContrato,
  actualizarRenovacionEsperada,
} from "../actions";
import { crearComisionAlquiler } from "../../caja/actions";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { RepartoPreview } from "@/components/backoffice/RepartoPreview";
import { DatePicker } from "@/components/backoffice/DatePicker";
import { ClientPicker } from "@/components/backoffice/ClientPicker";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";
import { EditableAgentesCard } from "@/components/backoffice/EditableAgentesCard";
import { EditableRenovacionCard } from "@/components/backoffice/EditableRenovacionCard";

const statusLabels: Record<string, string> = {
  BORRADOR: "Borrador",
  FIRMADO: "Firmado",
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
  ANULADO: "Anulado",
};

const paymentStatusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada",
  PARCIAL: "Parcial",
  PAGADO: "Pagado",
};

const documentTypeLabels: Record<string, string> = {
  CONTRATO: "Contrato",
  DNI_INQUILINO: "DNI INQUILINO + INGRESOS + INFORME BCRA UNIFICADOS",
  DNI_GARANTE: "DNI GARANTE + INGRESOS + INFORME BCRA UNIFICADOS",
  OTRO: "DOCUMENTACIÓN RESPALDATORIA EXTRA",
};

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const profile = await requirePermission("administraciones.ver");
  const scope = await getContractGroupScope(profile);
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  // Ninguna de estas tres depende del resultado de las otras dos
  // (canManageGroups solo necesita `profile`, ya disponible) — pedirlas
  // en paralelo en vez de en cadena ahorra dos viajes de ida y vuelta a
  // la base por carga de página.
  const canManageGroups = profile.permissions.includes("administraciones.grupos.gestionar");
  const [contract, groups] = await Promise.all([
    getContractById(numericId, scope),
    canManageGroups ? getContractGroups() : Promise.resolve([]),
  ]);
  if (!contract) notFound();

  // Colocar un inquilino nuevo y renovarle el contrato a uno que ya
  // estaba son unidades de negocio distintas para la comisión — ver
  // comentario en RentalCommission.origin.
  const isRenewal = !!contract.renewedFromContractId;
  const canCreateCommission = profile.permissions.includes("caja.comisiones.crear");
  const needsCommissionForm = canCreateCommission && !contract.rentalCommission;

  // Una colocación firmada queda cerrada — partes y agentes ya no se
  // editan más (ver assertColocacionEditable del lado del servidor).
  const isColocacionFirmada = !contract.isAdministered && contract.status === "FIRMADO";
  const canEditAgentes = profile.permissions.includes("administraciones.crear") && !isColocacionFirmada;
  const canMarcarFirmado =
    !contract.isAdministered &&
    contract.status === "BORRADOR" &&
    profile.permissions.includes("administraciones.firmar");

  // Estas tres sí dependen de `contract` (recién resuelto arriba), pero
  // no dependen entre sí — misma idea, una sola tanda en paralelo.
  const [documentsWithUrls, agents, alquilerScheme] = await Promise.all([
    Promise.all(contract.documents.map(async (doc) => ({ ...doc, url: await getSignedDocumentUrl(doc.storagePath) }))),
    needsCommissionForm || canEditAgentes ? getAgents() : Promise.resolve([]),
    needsCommissionForm ? getActiveCommissionScheme(isRenewal ? "RENOVACION" : "ALQUILER") : Promise.resolve(null),
  ]);

  // Solo se puede anular si todavía no movió plata — ver anularContrato.
  // El estado "vigente para anular" depende del tipo: un administrado es
  // ACTIVO, una colocación es BORRADOR (FIRMADO ya está cerrada).
  const yaMovioPlata =
    !!contract.rentalCommission ||
    contract.payments.some((p) => p.status === "PAGADO" || p.status === "PARCIAL" || p.status === "ENVIADA");
  const estadoVigenteParaAnular = contract.isAdministered ? "ACTIVO" : "BORRADOR";
  const canAnular =
    profile.permissions.includes("administraciones.crear") &&
    contract.status === estadoVigenteParaAnular &&
    !yaMovioPlata;

  return (
    <div className="max-w-6xl w-full mx-auto">
      {/* Cabecera Principal */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{contract.unit.address}</h1>
          <p className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/backoffice/historial/${contract.unit.id}`} className="hover:underline font-semibold text-accent">
              Código {contract.unit.propertyCode}
            </Link>{" "}
            ·{" "}
            <span>
              Inquilino:{" "}
              {contract.tenant ? (
                <Link href={`/backoffice/clientes/${contract.tenant.id}`} className="hover:underline font-semibold text-foreground">
                  {contract.tenant.firstName} {contract.tenant.lastName}
                </Link>
              ) : (
                <span className="font-semibold text-muted">A completar</span>
              )}
            </span>{" "}
            ·{" "}
            <span>
              Propietario:{" "}
              {contract.owner ? (
                <Link href={`/backoffice/clientes/${contract.owner.id}`} className="hover:underline font-semibold text-foreground">
                  {contract.owner.firstName} {contract.owner.lastName}
                </Link>
              ) : (
                <span className="font-semibold text-muted">A completar</span>
              )}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-surface border border-border px-3 py-1 text-xs font-bold text-foreground shadow-xs">
            Contrato: {statusLabels[contract.status]}
          </span>
          <Link
            href={`/backoffice/administraciones/nuevo?renovarDe=${contract.id}`}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface/10 hover:text-foreground transition-colors shadow-xs"
          >
            Renovar contrato
          </Link>
        </div>
      </div>

      {canEditAgentes && (!contract.owner || !contract.tenant) && (
        <div className="mb-6 rounded-xl border border-dashed border-border p-5">
          <h2 className="mb-3 text-sm font-medium text-foreground">Partes del contrato</h2>
          <p className="mb-3 text-xs text-muted">
            No hace falta completarlas al cargar el contrato — se pueden confirmar después.
          </p>
          <form action={actualizarPartesContrato.bind(null, contract.id)} className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <ClientPicker namePrefix="owner" roleLabel="Propietario" initialSelected={contract.owner} />
            </div>
            <div className="flex-1">
              <ClientPicker namePrefix="tenant" roleLabel="Inquilino" initialSelected={contract.tenant} />
            </div>
            <button
              type="submit"
              className="h-fit rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface sm:self-end"
            >
              Guardar
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Principal Izquierda (Ficha Financiera y Liquidaciones) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Tarjeta de Datos Clave */}
          <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Vigencia e Importes</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Alquiler actual</dt>
                <dd className="font-bold text-lg text-foreground">
                  {contract.currency} {contract.rentAmount.toString()}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Administración</dt>
                <dd className="text-foreground font-semibold">
                  {contract.isAdministered ? `Sí — ${contract.managementFeePercent?.toString()}%` : "No administramos este contrato"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Vigencia</dt>
                <dd className="text-foreground font-medium">
                  {fmtDate.format(contract.startDate)} — {fmtDate.format(contract.endDate)}
                  <span className="block text-[10px] text-muted mt-0.5">({contract.durationMonths} meses)</span>
                </dd>
              </div>
              {contract.isAdministered && (
                <div>
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Vencimiento mensual</dt>
                  <dd className="text-foreground font-medium">Día {contract.paymentDueDay} de cada mes</dd>
                </div>
              )}
              {contract.isAdministered && (
                <div>
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Actualización</dt>
                  <dd className="text-foreground font-medium">
                    {contract.indexationFrequencyMonths
                      ? `Cada ${contract.indexationFrequencyMonths} meses ${contract.indexType ? `(${contract.indexType.code})` : ""}`
                      : "No aplica"}
                  </dd>
                </div>
              )}
              {contract.isAdministered && contract.nextIndexationDueAt && (
                <div>
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Próxima actualización</dt>
                  <dd className="text-foreground font-semibold text-accent">{fmtDate.format(contract.nextIndexationDueAt)}</dd>
                </div>
              )}
              {contract.terminatedAt && (
                <div>
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Finalizado</dt>
                  <dd className="text-foreground font-semibold text-accent-strong">
                    {fmtDate.format(contract.terminatedAt)}
                    {contract.terminationReason ? ` — ${contract.terminationReason}` : ""}
                  </dd>
                </div>
              )}
              {(contract.paymentAlias || contract.paymentCBU) && (
                <div className="col-span-2 sm:col-span-3 border-t border-border/40 pt-3 mt-1">
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Cuenta del alquiler (propietario)</dt>
                  <dd className="text-foreground font-medium flex flex-wrap gap-x-4">
                    {contract.paymentAlias && <span><strong>Alias:</strong> {contract.paymentAlias}</span>}
                    {contract.paymentCBU && <span><strong>CBU:</strong> {contract.paymentCBU}</span>}
                  </dd>
                </div>
              )}
              {contract.tenantPaysCommission && (contract.commissionAlias || contract.commissionCBU) && (
                <div className="col-span-2 sm:col-span-3 pt-1">
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">
                    Cuenta de la comisión (inmobiliaria) — la transfiere el inquilino
                  </dt>
                  <dd className="text-foreground font-medium flex flex-wrap gap-x-4">
                    {contract.commissionAlias && <span><strong>Alias:</strong> {contract.commissionAlias}</span>}
                    {contract.commissionCBU && <span><strong>CBU:</strong> {contract.commissionCBU}</span>}
                  </dd>
                </div>
              )}
              {contract.concepts.length > 0 && (
                <div className="col-span-2 sm:col-span-3 border-t border-border/40 pt-3">
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Conceptos recurrentes contratados</dt>
                  <dd className="text-foreground font-medium">{contract.concepts.map((c) => c.concept.name).join(", ")}</dd>
                </div>
              )}
              {contract.notes && (
                <div className="col-span-2 sm:col-span-3 border-t border-border/40 pt-3">
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Notas adicionales</dt>
                  <dd className="whitespace-pre-line text-foreground text-xs">{contract.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Cronograma de Liquidaciones — no aplica si no administramos:
              ya lo dice la línea "Administración" de arriba, repetir una
              tarjeta entera solo para decir "no aplica" es ruido. */}
          {contract.isAdministered && (
            <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Cronograma de Liquidaciones</h2>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50/50 border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-2.5 font-bold">Período</th>
                      <th className="px-4 py-2.5 font-bold">Vence</th>
                      <th className="px-4 py-2.5 font-bold">Total</th>
                      <th className="px-4 py-2.5 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-white">
                    {contract.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-surface/60 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/backoffice/administraciones/${contract.id}/liquidaciones/${p.id}`}
                            className="font-semibold text-accent hover:underline"
                          >
                            {monthNames[p.periodMonth - 1]} {p.periodYear}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-muted font-medium">{fmtDate.format(p.dueDate)}</td>
                        <td className="px-4 py-2.5 text-foreground font-semibold">
                          {p.currency} {paymentTotal(p.items).toLocaleString("es-AR")}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold ${p.status === "PAGADO" ? "text-emerald-700" : "text-muted"}`}>
                            {paymentStatusLabels[p.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comisión de Contrato */}
          <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">
              {isRenewal ? "Comisión de Renovación" : "Comisión de Alquiler"}
            </h2>
            {contract.rentalCommission ? (
              <p className="text-sm text-foreground">
                {contract.rentalCommission.currency} {contract.rentalCommission.amount.toString()}
                {contract.rentalCommission.origin === "RENOVACION" ? (
                  " — sin reparto por agente (unidad de negocio de renovaciones)"
                ) : (
                  <>
                    {" "}
                    — Vendedor: {agentLabel(contract.rentalCommission.vendedorAgent)} · Captador:{" "}
                    {agentLabel(contract.rentalCommission.captadorAgent)}
                  </>
                )}{" "}
                · {fmtDate.format(contract.rentalCommission.earnedAt)}
                {profile.permissions.includes("caja.ver") && (
                  <>
                    {" · "}
                    <Link href={`/backoffice/caja/comisiones/${contract.rentalCommission.id}`} className="text-accent hover:underline">
                      Ver cobro
                    </Link>
                  </>
                )}
              </p>
            ) : canCreateCommission ? (
              <form
                action={crearComisionAlquiler.bind(null, contract.id)}
                className="flex flex-wrap items-end gap-3"
              >
                <div className="w-56">
                  <RepartoPreview name="amount" label="Monto" scheme={alquilerScheme && toRepartoSchemeInfo(alquilerScheme)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="currency" className="text-xs text-muted">
                    Moneda
                  </label>
                  <select id="currency" name="currency" defaultValue={contract.currency} className="field">
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="earnedAt" className="text-xs text-muted">
                    Fecha
                  </label>
                  <DatePicker id="earnedAt" name="earnedAt" required />
                </div>
                {!isRenewal && (
                  <>
                    <AgentSelect
                      agents={agents}
                      defaultValue={contract.vendedorAgentId ?? profile.id}
                      name="vendedorAgentId"
                      label="Agente vendedor"
                      required={false}
                    />
                    <AgentSelect
                      agents={agents}
                      defaultValue={contract.captadorAgentId ?? undefined}
                      name="captadorAgentId"
                      label="Agente captador"
                      required={false}
                    />
                  </>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent-strong cursor-pointer shadow-xs transition-colors"
                >
                  Cargar comisión
                </button>
                {!alquilerScheme && (
                  <p className="w-full text-[11px] text-muted">
                    {isRenewal
                      ? "Todavía no hay un esquema de Renovaciones configurado — se guarda entera para la inmobiliaria."
                      : "Todavía no hay un esquema de Alquiler configurado — se guarda sin repartir."}{" "}
                    <a href="/backoffice/agentes/esquema" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      Configurarlo en Pagos a agentes › Esquema
                    </a>
                    .
                  </p>
                )}
              </form>
            ) : (
              <p className="text-sm text-muted">Sin comisión cargada.</p>
            )}
          </div>

          {/* Indexaciones / Actualizaciones — de solo lectura acá a
              propósito: aplicar una actualización nueva se hace desde
              Administraciones > Actualizaciones (la lista de tareas), no
              desde acá. Tenerlo en los dos lados invitaba a aplicarla dos
              veces por error sin darse cuenta. Lo que sí vale la pena
              conservar acá es el historial con el comprobante de cada
              una, para que no se pierda. */}
          {contract.isAdministered && profile.permissions.includes("administraciones.indexacion") && (
            <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Actualizaciones e Indexación</h2>
                <Link
                  href="/backoffice/administraciones/actualizaciones"
                  className="text-xs font-semibold text-accent hover:underline whitespace-nowrap"
                >
                  Aplicar una nueva →
                </Link>
              </div>

              {contract.indexations.length > 0 ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {contract.indexations.map((i) => (
                    <li key={i.id} className="text-muted text-xs border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                      <strong>{fmtDate.format(i.appliedAt)}:</strong> {contract.currency} {i.previousAmount.toString()} →{" "}
                      <span className="text-foreground font-semibold">{contract.currency} {i.newAmount.toString()}</span>
                      {i.percentage !== null ? ` (${Number(i.percentage) > 0 ? "+" : ""}${i.percentage.toString()}%${i.indexType ? ` · ${i.indexType.code}` : ""})` : i.indexType ? ` (${i.indexType.code})` : ""}
                      {i.notes && <span className="block text-[10px] text-muted font-normal mt-0.5">Nota: {i.notes}</span>}
                      {" · "}
                      <Link
                        href={`/backoffice/administraciones/${contract.id}/indexaciones/${i.id}/imprimir`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        Comprobante
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Todavía no se aplicó ninguna actualización.</p>
              )}
            </div>
          )}
        </div>

        {/* Columna Lateral Derecha (Auxiliares y Formularios de Edición/Cierre) */}
        <div className="flex flex-col gap-6">
          {/* Garantes */}
          {contract.guarantors.length > 0 && (
            <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Garantes</h2>
              <ul className="flex flex-col gap-2.5 text-xs">
                {contract.guarantors.map((g) => (
                  <li key={g.id} className="text-foreground border-b border-border/30 pb-2 last:border-0 last:pb-0">
                    <Link href={`/backoffice/clientes/${g.client.id}`} className="font-semibold text-accent hover:underline block mb-0.5">
                      {g.client.firstName} {g.client.lastName}
                    </Link>
                    <span className="text-muted block">
                      {g.client.docId ? `DNI ${g.client.docId}` : ""}
                      {g.client.docId && g.client.phone ? " · " : ""}
                      {g.client.phone ? `${g.client.phone}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Documentos */}
          <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Documentación</h2>
            {documentsWithUrls.length > 0 && (
              <ul className="mb-4 flex flex-col gap-2.5 text-xs">
                {documentsWithUrls.map((doc) => (
                  <li key={doc.id} className="border-b border-border/30 pb-2 last:border-0 last:pb-0">
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline flex items-center gap-1">
                        <svg className="h-3.5 w-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate max-w-[140px]">{doc.fileName}</span>
                      </a>
                    ) : (
                      <span className="text-muted">{doc.fileName}</span>
                    )}
                    <span className="text-[10px] text-muted block mt-0.5">
                      Tipo: {documentTypeLabels[doc.type]} · por @{doc.uploadedBy.username}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            
            <form action={subirDocumento.bind(null, contract.id)} className="flex flex-col gap-3 border-t border-border/40 pt-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="docType" className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Tipo de archivo
                </label>
                <select id="docType" name="type" defaultValue="CONTRATO" className="field w-full text-xs py-1.5">
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="file" className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Archivo (PDF, máx. 10MB)
                </label>
                <input id="file" name="file" type="file" accept="application/pdf" required className="field w-full text-xs py-1" />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-accent text-accent-foreground py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent-strong cursor-pointer shadow-xs transition-colors"
              >
                Subir Documento
              </button>
            </form>
          </div>

          {/* Grupo de Contrato — no aplica a una colocación sin
              administración: el grupo es la cartera que un administrador
              gestiona (liquidaciones, indexación), y una colocación no
              tiene nada de eso para gestionar (ver getContracts). */}
          {contract.isAdministered && (
            <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Grupo Asignado</h2>
              {canManageGroups ? (
                <form action={asignarGrupoContrato.bind(null, contract.id)} className="flex flex-col gap-3">
                  <select name="groupId" defaultValue={contract.groupId ?? ""} className="field w-full text-xs py-1.5">
                    <option value="">— Sin grupo asignado —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="w-full rounded-lg border border-border bg-surface py-2 text-xs font-bold uppercase tracking-wider hover:bg-surface/10 hover:text-foreground cursor-pointer shadow-xs transition-colors">
                    Guardar Grupo
                  </button>
                </form>
              ) : (
                <p className="text-xs text-foreground font-semibold">{contract.group?.name ?? "Sin grupo asignado"}</p>
              )}
            </div>
          )}

          {/* Comisión de renovación — solo aplica a lo que administramos:
              alimenta la proyección financiera de contratos ACTIVO
              (getContractsNearingEnd), y una colocación nunca pasa por
              ese estado. */}
          {contract.isAdministered && (
          <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">¿Cobra comisión al renovar?</h2>
            <EditableRenovacionCard
              defaultValue={contract.renewalCommissionExpected}
              canEdit={canEditAgentes}
              action={actualizarRenovacionEsperada.bind(null, contract.id)}
            />
          </div>
          )}

          {/* Agentes — solo lectura por default (ya se cargan al alta del
              contrato); "Editar" recién muestra el form si hace falta
              corregir algo, en vez de tenerlo siempre abierto. */}
          <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Agentes Involucrados</h2>
            <EditableAgentesCard
              agents={agents}
              defaultVendedorId={contract.vendedorAgentId ?? undefined}
              defaultCaptadorId={contract.captadorAgentId ?? undefined}
              vendedorLabel={agentLabel(contract.vendedorAgent)}
              captadorLabel={agentLabel(contract.captadorAgent)}
              canEdit={canEditAgentes}
              action={actualizarAgentesContrato.bind(null, contract.id)}
            />
          </div>

          {/* Cierre / Finalización — administrado y colocación siguen
              ciclos de vida completamente distintos a partir de acá, así
              que van en bloques separados en vez de compartir uno con
              ramas. */}
          {contract.isAdministered ? (
            // "Finalizar" (venció, rescindido) es un evento del alquiler
            // que administramos; "Anular" (cargado por error) solo si
            // todavía no movió plata.
            profile.permissions.includes("administraciones.crear") &&
            contract.status === "ACTIVO" && (
              <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Finalizar o Anular</h2>

                <form action={finalizarContrato.bind(null, contract.id)} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="terminationStatus" className="text-[10px] font-bold text-muted uppercase tracking-wider">
                      Motivo de Cierre
                    </label>
                    <select id="terminationStatus" name="status" defaultValue="FINALIZADO" className="field w-full text-xs py-1.5">
                      <option value="FINALIZADO">Finalizado (venció)</option>
                      <option value="RESCINDIDO">Rescindido</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="terminationReason" className="text-[10px] font-bold text-muted uppercase tracking-wider">
                      Notas adicionales
                    </label>
                    <input id="terminationReason" name="terminationReason" className="field w-full text-xs" placeholder="Ej. Entrega llaves" />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-border bg-surface py-2 text-xs font-bold uppercase tracking-wider hover:bg-surface/10 hover:text-foreground cursor-pointer shadow-xs transition-colors"
                  >
                    Finalizar Contrato
                  </button>
                </form>

                {canAnular ? (
                  <div className="mt-4 border-t border-border/40 pt-4">
                    <p className="mb-2 text-[10px] text-muted leading-relaxed">
                      Si el contrato se cargó por error y nunca debió existir, puedes anularlo. Se eliminarán sus liquidaciones.
                    </p>
                    <form action={anularContrato.bind(null, contract.id)} className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="anularReason" className="text-[10px] font-bold text-muted uppercase tracking-wider">
                          Motivo de Anulación
                        </label>
                        <input id="anularReason" name="terminationReason" className="field w-full text-xs" placeholder="Cargado por error" />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors shadow-xs"
                      >
                        Anular Contrato
                      </button>
                    </form>
                  </div>
                ) : (
                  yaMovioPlata && (
                    <p className="mt-3 text-[10px] text-muted leading-relaxed italic">
                      Este contrato ya cuenta con movimientos monetarios (comisión o cobros) por lo que no se puede anular, únicamente finalizar.
                    </p>
                  )
                )}
              </div>
            )
          ) : (
            // Colocación: BORRADOR (se puede seguir cargando, marcar como
            // firmada, o anular si no se cargó comisión todavía) vs.
            // FIRMADO (cerrada — no hay nada que hacer acá, para corregirla
            // está "Eliminar definitivamente" más abajo).
            (canMarcarFirmado || canAnular) && (
              <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Firmar o Anular</h2>

                {canMarcarFirmado && (
                  <form action={marcarContratoFirmado.bind(null, contract.id)} className="flex flex-col gap-2">
                    <p className="text-[10px] text-muted leading-relaxed">
                      Marcala como firmada cuando la operación ya cerró — a partir de ahí, partes y agentes quedan
                      bloqueados (el cobro de la comisión sigue funcionando igual).
                    </p>
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-accent text-accent-foreground py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent-strong cursor-pointer shadow-xs transition-colors"
                    >
                      Marcar como Firmado
                    </button>
                  </form>
                )}

                {canAnular && (
                  <div className={canMarcarFirmado ? "mt-4 border-t border-border/40 pt-4" : ""}>
                    <p className="mb-2 text-[10px] text-muted leading-relaxed">
                      Si esta colocación se cargó por error y nunca debió existir, podés anularla.
                    </p>
                    <form action={anularContrato.bind(null, contract.id)} className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="anularReason" className="text-[10px] font-bold text-muted uppercase tracking-wider">
                          Motivo de Anulación
                        </label>
                        <input id="anularReason" name="terminationReason" className="field w-full text-xs" placeholder="Cargado por error" />
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors shadow-xs"
                      >
                        Anular Contrato
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )
          )}

          {/* Eliminar definitivamente — a diferencia de Anular (que solo
              deshace un alta reciente sin plata movida) o Finalizar (el
              contrato terminó de verdad), esto borra todo lo cargado
              encima aunque ya se haya operado: liquidaciones, cobros,
              comisión de alquiler y sus cuotas, pagos a agentes por esa
              comisión, documentos. Permiso aparte a propósito — no es
              para el uso normal, es para corregir una carga errónea. */}
          {profile.permissions.includes("administraciones.eliminar") && (
            <div className="rounded-xl border border-accent/30 bg-accent-soft/10 p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-accent mb-2">Eliminar definitivamente</h2>
              <p className="mb-3 text-[10px] text-muted leading-relaxed">
                Borra el contrato entero junto con todo lo que tenga cargado encima — liquidaciones, cobros,
                indexaciones, comisión de alquiler y sus cuotas/cobros, pagos ya hechos a agentes por esa comisión, y
                los documentos subidos. No hay forma de deshacerlo. Usalo solo para corregir una carga errónea.
              </p>
              <ConfirmDeleteButton
                action={eliminarContratoDefinitivo.bind(null, contract.id)}
                triggerLabel="Eliminar contrato definitivamente"
                triggerClassName="w-full rounded-lg border border-accent/50 bg-transparent py-2 text-xs font-bold uppercase tracking-wider text-accent hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors shadow-xs"
                title={`¿Eliminar el contrato de ${contract.unit.address} por completo?`}
                description="Se van a borrar TODAS las operaciones vinculadas a este contrato (liquidaciones, cobros, comisión, pagos a agentes, documentos). Esta acción no se puede deshacer."
                confirmLabel="Sí, eliminar todo"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

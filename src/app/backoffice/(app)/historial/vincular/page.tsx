import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getVinculacionesHistorial, type EstadoVinculo } from "@/lib/propiedades";
import type { Coincidencia } from "@/lib/vinculacion";
import { ActionForm } from "@/components/backoffice/ActionForm";
import { SubmitButton } from "@/components/backoffice/SubmitButton";
import { EstadoPropiedadBadge } from "@/components/backoffice/EstadoPropiedadBadge";
import { desvincularUnidad, vincularCoincidentes, vincularUnidad } from "../actions";

const COINCIDENCIA: Record<Coincidencia, { label: string; clase: string }> = {
  coincide: { label: "Misma dirección", clase: "text-emerald-700 dark:text-emerald-400" },
  parecida: { label: "Dirección parecida: revisar", clase: "text-amber-700 dark:text-amber-400" },
  distinta: { label: "Dirección distinta: revisar", clase: "text-destructive" },
};

const ESTADO: Record<EstadoVinculo, string> = {
  vinculada: "Vinculada",
  "para-vincular": "Para vincular",
  conflicto: "Ficha ya vinculada a otra",
  "sin-ficha": "Sin ficha con ese código",
};

const botonChico = "rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-surface cursor-pointer";

// Une cada propiedad del Historial (contratos, ventas y tasaciones
// cargados a mano) con su ficha, por código. Así la ficha muestra toda la
// historia de la propiedad y el Historial queda con los códigos normalizados.
export default async function VincularHistorialPage() {
  await requirePermission("historial.editar");
  const filas = await getVinculacionesHistorial();
  const cuenta = (e: EstadoVinculo) => filas.filter((f) => f.estado === e).length;
  const automaticas = filas.filter((f) => f.estado === "para-vincular" && f.coincidencia !== "distinta").length;
  const orden: EstadoVinculo[] = ["para-vincular", "conflicto", "sin-ficha", "vinculada"];

  return (
    <div className="max-w-6xl">
      <Link href="/backoffice/historial" className="mb-2 inline-block text-xs text-accent hover:underline">← Historial</Link>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Vincular el Historial con las fichas</h1>
      <p className="mb-4 text-sm text-muted">
        Cada propiedad del Historial se une a su ficha por código (&quot;GARC1-359&quot; es la 359). Al vincular, el código del
        Historial queda normalizado y la ficha muestra sus contratos, ventas y tasaciones.
      </p>
      <p className="mb-4 text-sm text-muted">
        La dirección pasa a ser la de la ficha y la que tenía el Historial se guarda en sus notas (con el piso, la UF o la
        manzana). Las de dirección distinta pueden ser un código mal cargado: se revisan una por una y se elige qué dirección
        queda.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border p-4 text-sm">
        <span>Vinculadas: <b>{cuenta("vinculada")}</b></span>
        <span>Para vincular: <b>{cuenta("para-vincular")}</b></span>
        <span>Conflictos: <b>{cuenta("conflicto")}</b></span>
        <span>Sin ficha: <b>{cuenta("sin-ficha")}</b></span>
        {automaticas > 0 && (
          <ActionForm action={vincularCoincidentes} mensajeExito="Vinculadas las que coinciden" className="ml-auto">
            <SubmitButton pendingLabel="Vinculando..." className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer">
              Vincular las {automaticas} con dirección igual o parecida
            </SubmitButton>
          </ActionForm>
        )}
      </div>

      {orden.map((estado) => {
        const grupo = filas.filter((f) => f.estado === estado);
        if (grupo.length === 0) return null;
        return (
          <section key={estado} className="mb-8">
            <h2 className="mb-2 text-base font-semibold text-foreground">{ESTADO[estado]} ({grupo.length})</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2.5">Historial</th>
                    <th className="px-3 py-2.5">Ficha</th>
                    <th className="px-3 py-2.5">Dirección</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.map(({ unidad: u, ficha, coincidencia }) => (
                    <tr key={u.id} className="border-b border-border last:border-0 align-top">
                      <td className="px-3 py-2">
                        <Link href={`/backoffice/historial/${u.id}`} className="font-medium text-foreground hover:underline">{u.address}</Link>
                        <span className="block text-xs text-muted">
                          código {u.propertyCode} · {u._count.contracts} contrato(s), {u._count.sales} venta(s), {u._count.appraisals} tasación(es)
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {ficha ? (
                          <>
                            <Link href={`/backoffice/propiedades/${ficha.id}`} className="font-medium text-foreground hover:underline">
                              {ficha.code} · {ficha.address ?? ficha.contentTitle ?? ficha.title}
                            </Link>
                            <span className="mt-1 block"><EstadoPropiedadBadge estado={ficha.status} /></span>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 text-xs font-semibold ${ficha ? COINCIDENCIA[coincidencia].clase : "text-muted"}`}>
                        {ficha ? COINCIDENCIA[coincidencia].label : ""}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {estado === "para-vincular" && ficha && (
                          <div className="flex flex-col items-end gap-1.5">
                            <ActionForm action={vincularUnidad.bind(null, u.id, ficha.id, true)} mensajeExito="Vinculada">
                              <SubmitButton className={botonChico}>
                                {coincidencia === "distinta" ? "Vincular con la dirección de la ficha" : "Vincular"}
                              </SubmitButton>
                            </ActionForm>
                            {coincidencia === "distinta" && (
                              <ActionForm action={vincularUnidad.bind(null, u.id, ficha.id, false)} mensajeExito="Vinculada">
                                <SubmitButton className={botonChico}>Vincular y conservar la del Historial</SubmitButton>
                              </ActionForm>
                            )}
                          </div>
                        )}
                        {estado === "vinculada" && (
                          <ActionForm action={desvincularUnidad.bind(null, u.id)} mensajeExito="Desvinculada">
                            <SubmitButton className={botonChico}>Desvincular</SubmitButton>
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

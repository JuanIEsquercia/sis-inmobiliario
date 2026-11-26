import Link from "next/link";
import { finDeTurno } from "@/lib/visit-rules";
import { interesadoLabel, type VisitaLista } from "@/lib/visitas";
import { VisitaEstadoBadge } from "./VisitaEstadoBadge";

const fmtDia = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

// Lista de tarjetas de visita. `sin` oculta la columna que ya es obvia
// por el contexto (en la ficha de la propiedad no hace falta repetirla).
export function VisitasTabla({
  visitas,
  sin = [],
  vacio = "No hay visitas.",
}: {
  visitas: VisitaLista[];
  sin?: ("propiedad" | "interesado" | "vendedor")[];
  vacio?: string;
}) {
  if (visitas.length === 0) return <p className="text-sm text-muted">{vacio}</p>;
  const mostrar = (c: "propiedad" | "interesado" | "vendedor") => !sin.includes(c);
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2.5">Turno</th>
            {mostrar("propiedad") && <th className="px-3 py-2.5">Propiedad</th>}
            {mostrar("interesado") && <th className="px-3 py-2.5">Interesado</th>}
            {mostrar("vendedor") && <th className="px-3 py-2.5">Vendedor</th>}
            <th className="px-3 py-2.5">Llave</th>
            <th className="px-3 py-2.5">Estado</th>
            <th className="px-3 py-2.5">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {visitas.map((v) => (
            <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface">
              <td className="px-3 py-2 whitespace-nowrap">
                <Link href={`/backoffice/visitas/${v.id}`} className="font-medium text-foreground hover:underline">
                  {fmtDia(v.date)} · {v.slot}–{finDeTurno(v.slot)}
                </Link>
              </td>
              {mostrar("propiedad") && (
                <td className="px-3 py-2">
                  <span className="text-muted">{v.listing.code ?? "—"}</span>{" "}
                  <span className="text-foreground">{v.listing.address ?? v.listing.contentTitle ?? v.listing.title}</span>
                </td>
              )}
              {mostrar("interesado") && <td className="px-3 py-2 text-muted">{interesadoLabel(v)}</td>}
              {mostrar("vendedor") && <td className="px-3 py-2 text-muted">@{v.vendedor.username}</td>}
              <td className="px-3 py-2 text-xs text-muted">{v.keyLocation === "INMOBILIARIA" ? "Inmobiliaria" : "Contacto"}</td>
              <td className="px-3 py-2"><VisitaEstadoBadge v={v} /></td>
              <td className="px-3 py-2 text-muted">{v.outcome?.name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

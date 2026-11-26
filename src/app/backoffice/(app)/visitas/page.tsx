import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getAgents } from "@/lib/caja";
import { alcanceVisitas, getVisitas, puedeGestionarLlaves } from "@/lib/visitas";
import { ESTADO_VISITA_LABEL } from "@/lib/visit-rules";
import { VisitasTabla } from "@/components/backoffice/VisitasTabla";

interface PageProps {
  searchParams: Promise<{ vista?: string; vendedor?: string; codigo?: string; estado?: string }>;
}

const VISTAS = [
  { value: "hoy", label: "Hoy" },
  { value: "abiertas", label: "Abiertas" },
  { value: "todas", label: "Todas" },
];

export default async function VisitasPage({ searchParams }: PageProps) {
  const profile = await requirePermission("visitas.pedir");
  const sp = await searchParams;
  const vista = VISTAS.some((v) => v.value === sp.vista) ? sp.vista! : "hoy";
  const gestor = puedeGestionarLlaves(profile);
  const [visitas, agents] = await Promise.all([
    getVisitas({ ...sp, vista }, alcanceVisitas(profile)),
    gestor ? getAgents() : Promise.resolve([]),
  ]);

  const link = (v: string) => {
    const u = new URLSearchParams(Object.entries({ ...sp, vista: v }).filter(([, x]) => x) as [string, string][]);
    return `?${u.toString()}`;
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Tarjetas de visita</h1>
        <Link href="/backoffice/visitas/nueva" className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent-strong">
          Pedir llave
        </Link>
      </div>
      <p className="mb-5 text-sm text-muted">
        {gestor ? "Todas las visitas de la inmobiliaria." : "Tus visitas."} Cada pedido de llave abre una tarjeta con todo lo que pasó, del pedido al cierre.
      </p>

      <div className="mb-4 flex gap-1 rounded-xl border border-border p-1 w-fit">
        {VISTAS.map((v) => (
          <Link
            key={v.value}
            href={link(v.value)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${vista === v.value ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"}`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <form className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input type="hidden" name="vista" value={vista} />
        <input name="codigo" defaultValue={sp.codigo} placeholder="Código de propiedad" className="field" />
        <select name="estado" defaultValue={sp.estado ?? ""} className="field">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_VISITA_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {gestor ? (
          <select name="vendedor" defaultValue={sp.vendedor ?? ""} className="field">
            <option value="">Todos los vendedores</option>
            {agents.map((a) => <option key={a.id} value={a.id}>@{a.username}</option>)}
          </select>
        ) : (
          <span />
        )}
        <button type="submit" className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface cursor-pointer">
          Filtrar
        </button>
      </form>

      <VisitasTabla
        visitas={visitas}
        sin={gestor ? [] : ["vendedor"]}
        vacio={vista === "hoy" ? "No hay visitas para hoy." : "No hay visitas con esos filtros."}
      />
    </div>
  );
}

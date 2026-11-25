import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getAgents } from "@/lib/caja";
import { MAX_FOTOS_POR_PROPIEDAD } from "@/lib/property-images";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { NuevaPropiedadForm } from "@/components/backoffice/NuevaPropiedadForm";
import { PropiedadPublicacionFields } from "@/components/backoffice/PropiedadPublicacionFields";

export default async function NuevaPropiedadPage() {
  await requirePermission("propiedades.editar");
  const agents = await getAgents();

  return (
    <div className="max-w-5xl w-full mx-auto">
      <Link href="/backoffice/propiedades" className="mb-2 inline-block text-xs text-accent hover:underline">
        ← Propiedades
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Nueva propiedad</h1>
      <p className="mb-6 text-sm text-muted">
        El código se asigna solo (el siguiente de la numeración). Se crea sin publicar: se publica desde la ficha, una vez
        revisada.
      </p>

      <NuevaPropiedadForm
        maximo={MAX_FOTOS_POR_PROPIEDAD}
        datosInternos={
          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-foreground">Datos internos</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AgentSelect agents={agents} name="captadorAgentId" label="Captador" required={false} />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Notas internas</span>
                <textarea name="internalNotes" rows={2} className="field" />
              </label>
            </div>
          </fieldset>
        }
      >
        <PropiedadPublicacionFields />
      </NuevaPropiedadForm>
    </div>
  );
}

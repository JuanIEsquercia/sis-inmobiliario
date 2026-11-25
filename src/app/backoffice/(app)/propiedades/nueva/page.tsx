import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getAgents } from "@/lib/caja";
import { ActionForm } from "@/components/backoffice/ActionForm";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { SubmitButton } from "@/components/backoffice/SubmitButton";
import { PropiedadPublicacionFields } from "@/components/backoffice/PropiedadPublicacionFields";
import { crearPropiedad } from "../actions";

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
        El código se asigna solo (el siguiente de la numeración). Se crea sin publicar: después de guardar se cargan las
        fotos y se publica desde la ficha.
      </p>

      <ActionForm action={crearPropiedad} mensajeExito="Propiedad creada" className="flex flex-col gap-6">
        <PropiedadPublicacionFields />

        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-foreground">Datos internos</legend>
          <AgentSelect agents={agents} name="captadorAgentId" label="Captador" required={false} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Notas internas</span>
            <textarea name="internalNotes" rows={2} className="field" />
          </label>
        </fieldset>

        <div>
          <SubmitButton
            pendingLabel="Creando..."
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer"
          >
            Crear propiedad
          </SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

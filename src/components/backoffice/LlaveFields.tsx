"use client";

import { useState } from "react";
import { buscarClientesVisitas } from "@/app/backoffice/(app)/visitas/actions";
import { ClientPicker, type ClientOption } from "./ClientPicker";

// Campos de "dónde está la llave" en la ficha de la propiedad.
export function LlaveFields({
  d,
}: {
  d: {
    keyLocation: "INMOBILIARIA" | "CONTACTO" | null;
    keyNumber: string | null;
    keySets: number | null;
    keyNotes: string | null;
    keyContactRelation: string | null;
    keyContact: ClientOption | null;
  };
}) {
  const [ubicacion, setUbicacion] = useState(d.keyLocation ?? "");
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Dónde está la llave</span>
        <select name="keyLocation" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="field">
          <option value="">Sin indicar (no se puede pedir)</option>
          <option value="INMOBILIARIA">En la inmobiliaria (retirar de inmo)</option>
          <option value="CONTACTO">La tiene un contacto (propietario, encargado...)</option>
        </select>
      </label>

      {ubicacion === "INMOBILIARIA" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Nro. de llavero o lugar en el tablero</span>
          <input name="keyNumber" defaultValue={d.keyNumber ?? ""} className="field" />
        </label>
      )}

      {ubicacion === "CONTACTO" && (
        <>
          <ClientPicker namePrefix="keyContact" roleLabel="Contacto que tiene la llave" initialSelected={d.keyContact} search={buscarClientesVisitas} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Relación con la propiedad</span>
            <input name="keyContactRelation" defaultValue={d.keyContactRelation ?? ""} placeholder="Propietario, encargado, portero..." className="field" />
          </label>
        </>
      )}

      {ubicacion && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Juegos de llaves</span>
            <input name="keySets" type="number" min="0" defaultValue={d.keySets ?? ""} className="field" />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs text-muted">Indicaciones de acceso</span>
            <input name="keyNotes" defaultValue={d.keyNotes ?? ""} placeholder="Portero, alarma, horario..." className="field" />
          </label>
        </div>
      )}
    </div>
  );
}

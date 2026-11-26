"use client";

import { useState } from "react";
import { TURNOS, finDeTurno } from "@/lib/visit-rules";

// Fecha + turno de 30 minutos. Los turnos que ya tiene otra visita de la
// misma propiedad ese día se muestran deshabilitados (el servidor lo
// vuelve a controlar al guardar, y la base también).
export function TurnoPicker({
  hoy,
  ahora,
  tomados,
}: {
  hoy: string; // AAAA-MM-DD en Argentina
  ahora: string; // HH:MM en Argentina
  tomados: { dia: string; slot: string }[];
}) {
  const [dia, setDia] = useState(hoy);
  const ocupados = new Set(tomados.filter((t) => t.dia === dia).map((t) => t.slot));
  // Hoy no se ofrecen turnos que ya terminaron.
  const pasado = (slot: string) => dia === hoy && finDeTurno(slot) <= ahora;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Fecha*</span>
        <input type="date" name="date" required min={hoy} value={dia} onChange={(e) => setDia(e.target.value)} className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Turno (30 minutos)*</span>
        <select name="slot" required defaultValue="" key={dia} className="field">
          <option value="" disabled>Elegir...</option>
          {TURNOS.map((t) => (
            <option key={t} value={t} disabled={ocupados.has(t) || pasado(t)}>
              {t} a {finDeTurno(t)}
              {ocupados.has(t) ? " — ocupado" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

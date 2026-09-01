"use client";

import { useState } from "react";

// Checkbox "¿ya se cobró?" que revela el medio de cobro — el opt-in
// explícito para el camino rápido de "cargar y ya está cobrada al
// cierre", sin que cargar el hecho implique cobrarlo por default (ver
// comentario en crearTasacion).
export function YaCobradaFields({ label = "Ya se cobró" }: { label?: string }) {
  const [yaCobrada, setYaCobrada] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="yaCobrada" checked={yaCobrada} onChange={(e) => setYaCobrada(e.target.checked)} />
        {label}
      </label>
      {yaCobrada && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="method" className="text-xs text-muted">
            Medio de cobro*
          </label>
          <select id="method" name="method" defaultValue="TRANSFERENCIA" required className="field">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
      )}
    </div>
  );
}

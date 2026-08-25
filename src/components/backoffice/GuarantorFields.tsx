"use client";

import { useState } from "react";

export function GuarantorFields() {
  const [count, setCount] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <fieldset key={i} className="grid grid-cols-1 gap-4 rounded-lg border border-border p-3 sm:grid-cols-3">
          <legend className="col-span-full px-1 text-xs text-muted">Garante {i + 1}</legend>
          <input name={`guarantors.${i}.firstName`} placeholder="Nombre*" required className="field" />
          <input name={`guarantors.${i}.lastName`} placeholder="Apellido*" required className="field" />
          <input name={`guarantors.${i}.docId`} placeholder="DNI" className="field" />
          <input name={`guarantors.${i}.phone`} placeholder="Teléfono" className="field" />
          <input name={`guarantors.${i}.email`} type="email" placeholder="Email" className="field" />
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="w-fit text-sm text-accent hover:underline"
      >
        + Agregar otro garante
      </button>
    </div>
  );
}

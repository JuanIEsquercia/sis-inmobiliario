"use client";

// Tilda/destilda todos los checkboxes `name="contractIds"` asociados al
// form indicado — manipulación de DOM directa en vez de estado de React
// porque las filas son server-rendered (no hay un array común para
// levantar el estado sin convertir toda la tabla en Client Component).
// Busca en todo el documento, no solo dentro del <form>: esos
// checkboxes viven en las filas de la tabla, fuera del form, y se
// asocian vía el atributo form="..." — el atributo los suma al envío
// del form, pero no los mete en su árbol del DOM, así que
// form.querySelectorAll(...) nunca los encuentra.
export function SelectAllCheckbox({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Seleccionar todos"
      className="h-3.5 w-3.5 accent-accent"
      onChange={(e) => {
        document
          .querySelectorAll<HTMLInputElement>(`input[name="contractIds"][form="${formId}"]`)
          .forEach((cb) => {
            cb.checked = e.target.checked;
          });
      }}
    />
  );
}

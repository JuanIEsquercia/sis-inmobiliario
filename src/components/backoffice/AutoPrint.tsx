"use client";

import { useEffect } from "react";

// Dispara el diálogo de impresión del navegador apenas carga la
// página — desde ahí el usuario elige "Guardar como PDF" o mandarlo
// directo a una impresora, sin agregar una librería de generación de PDF.
export function AutoPrint() {
  useEffect(() => {
    window.print();
  }, []);

  return null;
}

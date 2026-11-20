"use client";

import { useFormStatus } from "react-dom";
import { useEnvioPendiente } from "./ActionForm";

interface SubmitButtonProps {
  children: React.ReactNode;
  /** Texto mientras la acción está corriendo. Default: "Procesando...". */
  pendingLabel?: string;
  className?: string;
}

// Botón de submit que se deshabilita solo mientras el server action está
// corriendo — patrón documentado de Next/React (useFormStatus dentro de
// un componente propio, anidado en el <form>, para no tener que volver
// client a la página entera).
//
// No es cosmético: sin esto, un formulario cuyo action tarda varios
// segundos (consultar la API del BCRA, subir un PDF, crear un contrato
// con 24 liquidaciones) se ve congelado, el agente vuelve a apretar y se
// dispara una SEGUNDA ejecución. Eso fue exactamente lo que pasó en
// Central de Deudores: 5 de las primeras 12 consultas guardadas eran
// duplicados a 3-4 segundos una de otra.
export function SubmitButton({ children, pendingLabel = "Procesando...", className }: SubmitButtonProps) {
  // useFormStatus cubre los <form action={...}> (FormWithFeedback);
  // useEnvioPendiente, los que van por <ActionForm>.
  const { pending: pendienteNativo } = useFormStatus();
  const pendienteActionForm = useEnvioPendiente();
  const pending = pendienteNativo || pendienteActionForm;

  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

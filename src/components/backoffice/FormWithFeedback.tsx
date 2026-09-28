"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionResult } from "@/app/backoffice/(app)/usuarios/actions";

interface FormWithFeedbackProps {
  // La acción ya viene con su id "atado" (.bind(null, id)), así que acá
  // llega con la forma que espera useActionState.
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  submitClassName?: string;
  footerClassName?: string;
}

// Formulario que avisa qué pasó. El patrón de este sistema hasta ahora
// era <form action={serverAction}> y listo: si la acción salía bien, la
// página se revalidaba y volvía IGUAL (mismos campos, mismos tildes), o
// sea que desde la pantalla no había diferencia entre "se guardó" y "no
// pasó nada". Y si fallaba, el throw se iba al error.tsx de toda la
// sección, que se siente como si te sacara de la página.
//
// useActionState resuelve las dos: deja que la acción devuelva un
// resultado (ok o error) y lo muestra acá al lado del botón, sin
// abandonar la pantalla. El botón además se deshabilita mientras corre
// (SubmitButton), que es lo que evita el doble submit.
export function FormWithFeedback({
  action,
  children,
  submitLabel,
  pendingLabel = "Guardando...",
  className,
  submitClassName,
  footerClassName = "flex flex-wrap items-center gap-3",
}: FormWithFeedbackProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {children}
      <div className={footerClassName}>
        <SubmitButton
          pendingLabel={pendingLabel}
          className={
            submitClassName ??
            "w-fit rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          }
        >
          {submitLabel}
        </SubmitButton>

        {state && (
          // role="status" para que un lector de pantalla lo anuncie sin
          // robar el foco.
          <p
            role="status"
            className={`text-xs font-semibold ${
              state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            }`}
          >
            {state.ok ? `✓ ${state.message}` : state.error}
          </p>
        )}
      </div>
    </form>
  );
}

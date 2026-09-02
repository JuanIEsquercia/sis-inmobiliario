"use client";

import { useRef } from "react";

// Confirmación genérica antes de una acción destructiva — un botón que
// dispara la acción de una sin este paso de por medio es fácil de tocar
// por error (ver PagarDeudaDialog para el mismo criterio aplicado a un
// pago). El submit real vive en un <form> propio dentro del modal: hasta
// que no se confirma, el server action ni se invoca.
export function ConfirmDeleteButton({
  action,
  triggerLabel = "Eliminar",
  triggerClassName,
  title = "¿Eliminar este registro?",
  description = "Esta acción no se puede deshacer.",
  confirmLabel = "Sí, eliminar",
}: {
  action: (formData: FormData) => void | Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={
          triggerClassName ??
          "rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface hover:text-foreground cursor-pointer"
        }
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border/60 bg-surface p-0 text-foreground shadow-premium backdrop:bg-black/50 backdrop:backdrop-blur-xs"
      >
        <div className="flex flex-col gap-5 p-6">
          <div>
            <h3 className="text-base font-bold text-foreground leading-snug">{title}</h3>
            <p className="text-sm text-muted mt-1.5">{description}</p>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-border/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface/80 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <form action={action}>
              <button
                type="submit"
                className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-all cursor-pointer"
              >
                {confirmLabel}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

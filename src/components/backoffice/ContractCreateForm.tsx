"use client";

import { useRef, useState, useTransition } from "react";
import { createContract } from "@/app/backoffice/(app)/administraciones/actions";

interface ContractCreateFormProps {
  children: React.ReactNode;
  submitLabel: string;
}

// El <form> del alta de contrato. Es de cliente por dos motivos que
// importan los dos:
//
// 1. Que un error NO borre lo cargado. Con <form action={createContract}>
//    un throw del servidor iba al error.tsx (página entera reemplazada) y,
//    aunque la acción devolviera el error, React resetea solo los campos
//    de un form con `action` cuando la acción termina — en un formulario
//    de este tamaño (unidad, partes, garantes, administración, PDFs) eso es
//    perder diez minutos de carga. Acá se envía desde onSubmit con
//    preventDefault + startTransition, que es el camino en el que React
//    NO toca los campos: se ve el motivo, se corrige y se reenvía.
//
// 2. Que no se dispare dos veces. El alta tarda (cronograma completo de
//    liquidaciones + PDFs); el botón queda deshabilitado mientras la
//    transición está pendiente, que incluye la navegación a la ficha.
//
// onSubmit solo corre si pasó la validación nativa del navegador, así
// que los avisos de campo (unidad sin elegir en UnitPicker, PDFs que se
// pasan del tope en DocumentosContratoFields) siguen frenando antes.
export function ContractCreateForm({ children, submitLabel }: ContractCreateFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      // Si sale bien, createContract hace redirect() a la ficha y no
      // vuelve nada; si falla, devuelve { ok: false, error }.
      const result = await createContract(formData);
      if (result && !result.ok) {
        setError(result.error);
        // El botón está al final de un formulario largo: se asegura que el
        // aviso quede a la vista sin mover el foco del campo a corregir.
        requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {children}

      <div className="flex flex-col gap-3">
        {error && (
          <p
            ref={errorRef}
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive"
          >
            No se guardó el contrato: {error}
            <span className="mt-1 block text-xs font-normal text-muted">
              Lo que cargaste sigue acá — corregilo y volvé a tocar &quot;{submitLabel}&quot;.
            </span>
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong disabled:opacity-60 disabled:cursor-wait"
        >
          {pending ? "Creando contrato..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

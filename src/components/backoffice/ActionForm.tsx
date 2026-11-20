"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import { requestFormReset } from "react-dom";
import type { ResultadoAccion } from "@/lib/accion";
import { useAvisos } from "./Avisos";

// Avisa a los botones de adentro (SubmitButton) que el envío está en
// curso: useFormStatus solo ve los formularios con action={...}, y este
// usa onSubmit (ver más abajo por qué).
const PendienteContext = createContext(false);

export function useEnvioPendiente(): boolean {
  return useContext(PendienteContext);
}

type FormProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit">;

interface ActionFormProps extends FormProps {
  // Server action ya "atada" a sus ids con .bind(null, ...), envuelta
  // con conAviso (ver lib/accion.ts).
  action: (formData: FormData) => Promise<ResultadoAccion | void>;
  // Texto del aviso cuando sale bien, en pasado y corto: "Cobro registrado".
  mensajeExito: string;
  // Para los diálogos: se cierran recién cuando la acción terminó bien.
  onExito?: () => void;
  // Opcional: un formulario puede estar vacío y llenarse con campos y
  // botones de afuera que lo apuntan con form="id".
  children?: React.ReactNode;
}

// Reemplazo de <form action={serverAction}> para todo el backoffice.
//
// Lo que resuelve, en el orden en que lo nota el agente:
//
// 1. Respuesta inmediata al clic: mientras la acción corre, el botón
//    que se apretó muestra un spinner y todos los botones de envío del
//    formulario quedan inactivos (estilos en globals.css, por
//    data-enviando / data-pendiente). Antes no pasaba nada visible
//    durante 1-3 segundos.
//
// 2. Doble envío: un segundo submit mientras el primero no terminó se
//    ignora. Sin esto, apretar dos veces "Cobrar" registraba dos cobros.
//
// 3. Confirmación: al terminar aparece "✓ <mensajeExito>". Antes la
//    pantalla volvía igual y no había forma de saber si se guardó.
//
// 4. Errores en su lugar: el mensaje de la acción ("Falta el monto")
//    aparece como aviso y el formulario conserva lo que se cargó. Antes
//    caía en la pantalla de error de la sección.
//
// Se usa onSubmit + transición, y no action={...}, a propósito: con
// action, React vacía el formulario al terminar SIEMPRE, también cuando
// la acción devolvió un error, y se perdía lo tipeado. Acá se vacía
// solo si salió bien (requestFormReset, el mismo mecanismo que usa React
// por dentro), así un alta queda limpia para la próxima carga.
export function ActionForm({ action, mensajeExito, onExito, children, ...formProps }: ActionFormProps) {
  const avisos = useAvisos();
  const [pendiente, startTransition] = useTransition();
  const enviando = useRef(false);
  // Error que se muestra DENTRO del formulario cuando este vive en un
  // <dialog> abierto: un modal queda en la capa superior del navegador,
  // por encima de los avisos flotantes, que quedarían tapados.
  const [errorEnDialogo, setErrorEnDialogo] = useState<string | null>(null);

  function mostrarError(form: HTMLFormElement, texto: string) {
    if (form.closest("dialog[open]")) setErrorEnDialogo(texto);
    else avisos.error(texto);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando.current) return;

    const form = event.currentTarget;
    setErrorEnDialogo(null);
    const boton = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    // El submitter va al FormData para que su name/value viaje igual que
    // en un envío nativo.
    const formData = new FormData(form, boton);

    enviando.current = true;
    boton?.setAttribute("data-enviando", "");

    startTransition(async () => {
      try {
        const resultado = await action(formData);
        if (resultado && !resultado.ok) {
          mostrarError(form, resultado.error);
          return;
        }
        avisos.exito(mensajeExito);
        requestFormReset(form);
        onExito?.();
      } catch (err) {
        // redirect() en la acción llega acá como una excepción: es un
        // éxito (crear y llevarte a la ficha nueva). Se avisa y se deja
        // seguir para que Next haga la navegación.
        if (esRedireccion(err)) {
          avisos.exito(mensajeExito);
          onExito?.();
          throw err;
        }
        console.error(err);
        mostrarError(form, "No se pudo conectar con el servidor. Revisá la conexión e intentá de nuevo.");
      } finally {
        enviando.current = false;
        boton?.removeAttribute("data-enviando");
      }
    });
  }

  return (
    <form {...formProps} onSubmit={handleSubmit} data-pendiente={pendiente || undefined} aria-busy={pendiente}>
      <PendienteContext.Provider value={pendiente}>{children}</PendienteContext.Provider>
      {errorEnDialogo && (
        <p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          {errorEnDialogo}
        </p>
      )}
    </form>
  );
}

function esRedireccion(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof err.digest === "string" &&
    err.digest.startsWith("NEXT_REDIRECT")
  );
}

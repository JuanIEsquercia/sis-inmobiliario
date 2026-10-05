"use client";

import { useRef, useState } from "react";

// Los cuatro PDF que se pueden adjuntar al dar de alta un contrato.
//
// Es un componente aparte, y de cliente, por una razón concreta: los
// archivos viajan en el mismo envío que el resto del formulario, y ese
// envío tiene un techo. Antes no se avisaba nada — se completaba todo,
// se confirmaba, y el servidor rechazaba el pedido entero con un 413 sin
// mensaje: ni contrato creado ni formulario recuperable.
//
// Acá se suma el peso a medida que se eligen los archivos y, si se pasa,
// el navegador bloquea el envío con un mensaje que dice cuánto pesan y
// qué hacer. Se usa setCustomValidity (validación nativa) y no un estado
// propio porque así frena el submit del <form> sin que este componente
// tenga que saber nada del botón de enviar, que vive afuera.
const CAMPOS = [
  { name: "contratoFile", label: "Contrato" },
  { name: "dniInquilinoFile", label: "DNI INQUILINO + INGRESOS + INFORME BCRA UNIFICADOS" },
  { name: "dniGaranteFile", label: "DNI GARANTE + INGRESOS + INFORME BCRA UNIFICADOS" },
  { name: "otroFile", label: "DOCUMENTACIÓN RESPALDATORIA EXTRA" },
] as const;

// Techo para la SUMA de los cuatro, no para cada uno: viajan juntos en
// el mismo pedido. Son 3,5 MB contra el límite de 4 MB de la Server
// Action (ver next.config.ts) — el resto queda para los campos del
// formulario y el empaquetado del envío.
const TOPE_TOTAL = 3.5 * 1024 * 1024;

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace(".", ",");

export function DocumentosContratoFields() {
  const [tamaños, setTamaños] = useState<Record<string, number>>({});
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const total = Object.values(tamaños).reduce((a, b) => a + b, 0);
  const excedido = total > TOPE_TOTAL;

  function alElegir(name: string) {
    const elegido = refs.current[name]?.files?.[0];
    const siguientes = { ...tamaños, [name]: elegido?.size ?? 0 };
    setTamaños(siguientes);

    const nuevoTotal = Object.values(siguientes).reduce((a, b) => a + b, 0);
    // El mensaje va en los cuatro: el que se pasó no es "el último que
    // elegiste", es el conjunto, y quien carga tiene que poder sacar
    // cualquiera de ellos.
    const mensaje =
      nuevoTotal > TOPE_TOTAL
        ? `Los PDF adjuntos suman ${mb(nuevoTotal)} MB y el máximo es ${mb(TOPE_TOTAL)} MB. Sacá alguno y subilo después desde la ficha del contrato, de a uno.`
        : "";
    for (const c of CAMPOS) refs.current[c.name]?.setCustomValidity(mensaje);
  }

  return (
    <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
        Documentos{" "}
        <span className="font-normal text-muted">
          (opcional, en PDF — también se pueden subir después, de a uno, desde la ficha del contrato)
        </span>
      </legend>

      {CAMPOS.map((c) => (
        <div key={c.name} className="flex flex-col gap-1.5">
          <label htmlFor={c.name} className="text-xs text-muted">
            {c.label}
          </label>
          <input
            id={c.name}
            name={c.name}
            type="file"
            accept="application/pdf"
            className="field"
            ref={(el) => {
              refs.current[c.name] = el;
            }}
            onChange={() => alElegir(c.name)}
          />
          {tamaños[c.name] ? <span className="text-[10px] text-muted">{mb(tamaños[c.name])} MB</span> : null}
        </div>
      ))}

      {total > 0 && (
        <p
          // role="status" para que un lector de pantalla lo anuncie sin
          // robar el foco mientras se eligen archivos.
          role="status"
          className={`col-span-full text-xs font-semibold ${excedido ? "text-destructive" : "text-muted"}`}
        >
          {excedido
            ? `Los PDF suman ${mb(total)} MB y el máximo es ${mb(TOPE_TOTAL)} MB. Sacá alguno y subilo después desde la ficha del contrato, de a uno.`
            : `Los PDF suman ${mb(total)} MB de ${mb(TOPE_TOTAL)} MB disponibles.`}
        </p>
      )}
    </fieldset>
  );
}

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
// Qué controla, apenas se elige cada archivo (sin esperar a guardar):
//   - que sea un PDF de verdad (mismo chequeo que el servidor: la firma
//     "%PDF-" al principio, no solo la extensión);
//   - que ese archivo solo no pase de 3,5 MB (tope por archivo de
//     lib/supabase/storage.ts);
//   - que los cuatro juntos no pasen de 3,5 MB (viajan en un solo envío).
//
// Y cada archivo elegido tiene su "✕ Quitar". Antes no había forma de
// sacar un archivo equivocado o demasiado pesado: el input de archivo
// del navegador no tiene botón para vaciarse, el formulario no se podía
// guardar y lo único que quedaba era recargar la página y perder toda la
// carga del contrato.
//
// Los avisos frenan el envío con setCustomValidity (validación nativa):
// así el submit del <form> se bloquea sin que este componente tenga que
// saber nada del botón de enviar, que vive afuera.
const CAMPOS = [
  { name: "contratoFile", label: "Contrato" },
  { name: "dniInquilinoFile", label: "DNI INQUILINO + INGRESOS + INFORME BCRA UNIFICADOS" },
  { name: "dniGaranteFile", label: "DNI GARANTE + INGRESOS + INFORME BCRA UNIFICADOS" },
  { name: "otroFile", label: "DOCUMENTACIÓN RESPALDATORIA EXTRA" },
] as const;

// Techo para la SUMA de los cuatro: viajan juntos en el mismo pedido.
// Son 3,5 MB contra el límite de 4 MB de la Server Action (ver
// next.config.ts) — el resto queda para los campos del formulario y el
// empaquetado del envío. Coincide con el tope por archivo del servidor.
const TOPE_TOTAL = 3.5 * 1024 * 1024;
const TOPE_POR_ARCHIVO = TOPE_TOTAL;

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1).replace(".", ",");

interface Elegido {
  nombre: string;
  tamaño: number;
  // Problema propio de este archivo (no es PDF, pesa demasiado solo).
  error: string | null;
}

async function problemaDelArchivo(archivo: File): Promise<string | null> {
  if (archivo.size > TOPE_POR_ARCHIVO) {
    return `Pesa ${mb(archivo.size)} MB y el máximo por archivo es ${mb(TOPE_POR_ARCHIVO)} MB. Quitalo y, si es un escaneo, bajá la calidad o dividilo en partes.`;
  }
  try {
    const firma = await archivo.slice(0, 5).text();
    if (archivo.type !== "application/pdf" || firma !== "%PDF-") {
      return "No es un PDF válido. Quitalo y elegí el archivo correcto.";
    }
  } catch {
    return "No se pudo leer el archivo. Quitalo y volvé a elegirlo.";
  }
  return null;
}

export function DocumentosContratoFields() {
  const [elegidos, setElegidos] = useState<Record<string, Elegido | undefined>>({});
  // Copia sincrónica del estado: alElegir es asíncrono (lee la firma del
  // archivo) y dos elecciones seguidas no pueden pisarse entre sí.
  const elegidosRef = useRef<Record<string, Elegido | undefined>>({});
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const total = Object.values(elegidos).reduce((suma, e) => suma + (e?.tamaño ?? 0), 0);
  const excedido = total > TOPE_TOTAL;

  // Recalcula el aviso de cada input. Va en todos porque el exceso del
  // total no es culpa del "último que elegiste": es el conjunto, y quien
  // carga tiene que poder sacar cualquiera de ellos.
  function aplicarValidez(siguientes: Record<string, Elegido | undefined>) {
    const nuevoTotal = Object.values(siguientes).reduce((suma, e) => suma + (e?.tamaño ?? 0), 0);
    const avisoTotal =
      nuevoTotal > TOPE_TOTAL
        ? `Los PDF adjuntos suman ${mb(nuevoTotal)} MB y el máximo es ${mb(TOPE_TOTAL)} MB. Quitá alguno y subilo después desde la ficha del contrato, de a uno.`
        : "";
    for (const c of CAMPOS) {
      refs.current[c.name]?.setCustomValidity(siguientes[c.name]?.error ?? avisoTotal);
    }
  }

  function actualizar(name: string, valor: Elegido | undefined) {
    const siguientes = { ...elegidosRef.current, [name]: valor };
    elegidosRef.current = siguientes;
    setElegidos(siguientes);
    aplicarValidez(siguientes);
  }

  async function alElegir(name: string) {
    const archivo = refs.current[name]?.files?.[0];
    if (!archivo) {
      actualizar(name, undefined);
      return;
    }
    const error = await problemaDelArchivo(archivo);
    // Si mientras se leía el archivo lo cambiaron o lo quitaron, este
    // resultado ya no corresponde.
    if (refs.current[name]?.files?.[0] !== archivo) return;
    actualizar(name, { nombre: archivo.name, tamaño: archivo.size, error });
  }

  function quitar(name: string) {
    const input = refs.current[name];
    if (input) input.value = "";
    actualizar(name, undefined);
    input?.focus();
  }

  return (
    <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <legend className="col-span-full mb-1 text-sm font-medium text-foreground">
        Documentos{" "}
        <span className="font-normal text-muted">
          (opcional, en PDF — también se pueden subir después, de a uno, desde la ficha del contrato)
        </span>
      </legend>

      {CAMPOS.map((c) => {
        const elegido = elegidos[c.name];
        return (
          <div key={c.name} className="flex flex-col gap-1.5">
            <label htmlFor={c.name} className="text-xs text-muted">
              {c.label}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={c.name}
                name={c.name}
                type="file"
                accept="application/pdf"
                aria-invalid={elegido?.error ? true : undefined}
                aria-describedby={elegido ? `${c.name}-estado` : undefined}
                className={`field min-w-0 flex-1 ${elegido?.error ? "border-destructive" : ""}`}
                ref={(el) => {
                  refs.current[c.name] = el;
                }}
                onChange={() => alElegir(c.name)}
              />
              {elegido && (
                <button
                  type="button"
                  onClick={() => quitar(c.name)}
                  aria-label={`Quitar el archivo ${elegido.nombre} de ${c.label}`}
                  title="Quitar este archivo"
                  className="flex-none rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
                >
                  ✕ Quitar
                </button>
              )}
            </div>
            {elegido && (
              <span
                id={`${c.name}-estado`}
                className={`text-[11px] ${elegido.error ? "font-semibold text-destructive" : "text-muted"}`}
              >
                {elegido.error ?? `${mb(elegido.tamaño)} MB`}
              </span>
            )}
          </div>
        );
      })}

      {total > 0 && (
        <p
          // role="status" para que un lector de pantalla lo anuncie sin
          // robar el foco mientras se eligen archivos.
          role="status"
          className={`col-span-full text-xs font-semibold ${excedido ? "text-destructive" : "text-muted"}`}
        >
          {excedido
            ? `Los PDF suman ${mb(total)} MB y el máximo es ${mb(TOPE_TOTAL)} MB. Quitá alguno con "✕ Quitar" y subilo después desde la ficha del contrato, de a uno.`
            : `Los PDF suman ${mb(total)} MB de ${mb(TOPE_TOTAL)} MB disponibles.`}
        </p>
      )}
    </fieldset>
  );
}

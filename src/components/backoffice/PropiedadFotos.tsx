"use client";

import { useRef, useState, useTransition } from "react";
import { eliminarFoto, moverFoto, subirFoto } from "@/app/backoffice/(app)/propiedades/actions";
import { useAvisos } from "./Avisos";

export interface FotoFicha {
  id: number;
  src: string;
  propia: boolean; // true = copia en nuestro Storage
}

// Antes de subir, la foto se achica en el navegador: las de celular pesan
// 4-8 MB y el envío a una server action tiene tope de 4 MB (ver
// next.config.ts). 2400 px de lado mayor sobra para la versión más
// grande que se guarda (1600) y deja margen para el recorte de bordes.
const LADO_MAXIMO_SUBIDA = 2400;

async function achicar(file: File): Promise<Blob> {
  const imagen = await createImageBitmap(file, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_MAXIMO_SUBIDA / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext("2d")!.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la foto"))), "image/jpeg", 0.9)
  );
}

export function PropiedadFotos({
  listingId,
  fotos,
  editable,
  maximo,
}: {
  listingId: number;
  fotos: FotoFicha[];
  editable: boolean;
  maximo: number;
}) {
  const avisos = useAvisos();
  const [pendiente, startTransition] = useTransition();
  const [progreso, setProgreso] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const lugares = maximo - fotos.length;

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>, exito: string) {
    startTransition(async () => {
      const r = await accion();
      if (r.ok) avisos.exito(exito);
      else avisos.error(r.error ?? "No se pudo completar la operación.");
    });
  }

  function subir(files: FileList | null) {
    if (!files || files.length === 0) return;
    const elegidas = Array.from(files).slice(0, lugares);
    if (files.length > lugares) avisos.error(`Solo entran ${lugares} foto(s) más: se suben las primeras.`);
    startTransition(async () => {
      let subidas = 0;
      for (const [i, file] of elegidas.entries()) {
        setProgreso(`Subiendo ${i + 1} de ${elegidas.length}...`);
        try {
          const fd = new FormData();
          fd.append("foto", new File([await achicar(file)], "foto.jpg", { type: "image/jpeg" }));
          const r = await subirFoto(listingId, fd);
          if (!r.ok) {
            avisos.error(r.error);
            break;
          }
          subidas++;
        } catch {
          avisos.error(`No se pudo leer "${file.name}". Probá con otra foto.`);
          break;
        }
      }
      setProgreso(null);
      if (input.current) input.current.value = "";
      if (subidas > 0) avisos.exito(subidas === 1 ? "Foto subida" : `${subidas} fotos subidas`);
    });
  }

  return (
    <div aria-busy={pendiente}>
      {fotos.length === 0 ? (
        <p className="text-sm text-muted">Sin fotos.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fotos.map((f, i) => (
            <li key={f.id} className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="relative aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura ya en tamaño final, sin optimizador */}
                <img src={f.src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                    Principal
                  </span>
                )}
                {!f.propia && (
                  <span className="absolute right-2 top-2 rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted">
                    Adinco
                  </span>
                )}
              </div>
              {editable && (
                <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={pendiente || i === 0}
                      onClick={() => ejecutar(() => moverFoto(listingId, f.id, "antes"), "Orden actualizado")}
                      className="rounded border border-border px-2 py-0.5 disabled:opacity-30 cursor-pointer"
                      aria-label="Mover antes"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={pendiente || i === fotos.length - 1}
                      onClick={() => ejecutar(() => moverFoto(listingId, f.id, "despues"), "Orden actualizado")}
                      className="rounded border border-border px-2 py-0.5 disabled:opacity-30 cursor-pointer"
                      aria-label="Mover después"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => {
                      if (confirm("¿Eliminar esta foto?")) ejecutar(() => eliminarFoto(listingId, f.id), "Foto eliminada");
                    }}
                    className="text-destructive hover:underline disabled:opacity-30 cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {lugares > 0 ? (
            <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface">
              {pendiente && progreso ? progreso : `Subir fotos (quedan ${lugares})`}
              <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={pendiente}
                onChange={(e) => subir(e.target.files)}
                className="sr-only"
              />
            </label>
          ) : (
            <span className="text-xs text-muted">Llegó al máximo de {maximo} fotos.</span>
          )}
          <span className="text-xs text-muted">La primera es la principal. Se recortan bordes blancos y se optimizan al subir.</span>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearPropiedad, subirFoto } from "@/app/backoffice/(app)/propiedades/actions";
import { achicarFoto } from "@/lib/achicar-foto";
import { useAvisos } from "./Avisos";

interface FotoElegida {
  file: File;
  vista: string; // URL local para la vista previa
}

// Alta de propiedad con las fotos en el mismo formulario. Al guardar:
// 1) se crea la ficha, 2) se suben las fotos una por una (achicadas en el
// navegador, ver achicarFoto) en el orden elegido, 3) se abre la ficha.
// Si una foto falla, la ficha igual queda creada y se avisa cuántas
// faltan: se pueden cargar desde la ficha.
export function NuevaPropiedadForm({
  maximo,
  children,
  datosInternos,
}: {
  maximo: number;
  children: React.ReactNode;
  datosInternos: React.ReactNode;
}) {
  const router = useRouter();
  const avisos = useAvisos();
  const [pendiente, startTransition] = useTransition();
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [progreso, setProgreso] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const vistas = useRef<string[]>([]);

  // Libera las vistas previas al salir de la pantalla.
  useEffect(() => () => vistas.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function agregar(files: FileList | null) {
    if (!files) return;
    const lugares = maximo - fotos.length;
    const nuevas = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, lugares)
      .map((file) => {
        const vista = URL.createObjectURL(file);
        vistas.current.push(vista);
        return { file, vista };
      });
    if (files.length > lugares) avisos.error(`Cada propiedad lleva hasta ${maximo} fotos: se agregaron las primeras.`);
    setFotos((prev) => [...prev, ...nuevas]);
    if (input.current) input.current.value = "";
  }

  function mover(i: number, j: number) {
    setFotos((prev) => {
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  function quitar(i: number) {
    setFotos((prev) => prev.filter((_, k) => k !== i));
  }

  function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendiente) return;
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setProgreso("Creando la propiedad...");
      const creada = await crearPropiedad(formData);
      if (!creada.ok) {
        setProgreso(null);
        avisos.error(creada.error);
        return;
      }
      const id = creada.dato;

      let fallidas = 0;
      for (const [i, f] of fotos.entries()) {
        setProgreso(`Subiendo foto ${i + 1} de ${fotos.length}...`);
        try {
          const fd = new FormData();
          fd.append("foto", await achicarFoto(f.file));
          const r = await subirFoto(id, fd);
          if (!r.ok) fallidas++;
        } catch {
          fallidas++;
        }
      }

      if (fallidas > 0) {
        avisos.error(`Propiedad creada, pero ${fallidas} foto(s) no se pudieron subir. Cargalas desde la ficha.`);
      } else {
        avisos.exito(fotos.length > 0 ? `Propiedad creada con ${fotos.length} foto(s)` : "Propiedad creada");
      }
      router.push(`/backoffice/propiedades/${id}`);
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" aria-busy={pendiente}>
      {children}

      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">Imágenes</legend>
        <p className="mb-3 text-xs text-muted">
          Hasta {maximo} fotos. La primera es la principal; se ordenan con las flechas. Al guardar se recortan los bordes
          blancos y se optimizan.
        </p>
        {fotos.length > 0 && (
          <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fotos.map((f, i) => (
              <li key={f.vista} className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="relative aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                  <img src={f.vista} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                      Principal
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                  <div className="flex gap-1">
                    <button type="button" disabled={pendiente || i === 0} onClick={() => mover(i, i - 1)} className="rounded border border-border px-2 py-0.5 disabled:opacity-30 cursor-pointer" aria-label="Mover antes">
                      ←
                    </button>
                    <button type="button" disabled={pendiente || i === fotos.length - 1} onClick={() => mover(i, i + 1)} className="rounded border border-border px-2 py-0.5 disabled:opacity-30 cursor-pointer" aria-label="Mover después">
                      →
                    </button>
                  </div>
                  <button type="button" disabled={pendiente} onClick={() => quitar(i)} className="text-destructive hover:underline disabled:opacity-30 cursor-pointer">
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {fotos.length < maximo ? (
          <label className="inline-block cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface">
            {fotos.length === 0 ? "Elegir fotos" : `Agregar fotos (quedan ${maximo - fotos.length})`}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={pendiente}
              onChange={(e) => agregar(e.target.files)}
              className="sr-only"
            />
          </label>
        ) : (
          <p className="text-xs text-muted">Llegó al máximo de {maximo} fotos.</p>
        )}
      </fieldset>

      {datosInternos}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent-strong disabled:opacity-60 cursor-pointer"
        >
          {pendiente ? progreso ?? "Guardando..." : "Crear propiedad"}
        </button>
        {pendiente && progreso && <span className="text-xs text-muted">{progreso}</span>}
      </div>
    </form>
  );
}

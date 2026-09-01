"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function Gallery({ images, title }: { images: { url: string }[]; title: string }) {
  const [active, setActive] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowRight") {
        setActive((prev) => (prev + 1) % images.length);
      } else if (e.key === "ArrowLeft") {
        setActive((prev) => (prev - 1 + images.length) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-3xl bg-surface/50 border border-border/40 text-sm text-muted">
        Sin fotos
      </div>
    );
  }

  const openLightboxAt = (index: number) => {
    setActive(index);
    setIsLightboxOpen(true);
  };

  return (
    <>
      {/* Vista de Galería en Mosaico Desktop / Compacta Móvil */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface shadow-premium">
        {images.length === 1 ? (
          // 1 sola imagen
          <div
            onClick={() => openLightboxAt(0)}
            className="relative aspect-[16/9] max-h-[420px] w-full cursor-pointer overflow-hidden group"
          >
            <Image
              src={images[0].url}
              alt={title}
              fill
              sizes="(min-width: 1024px) 70vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
            />
          </div>
        ) : images.length === 2 ? (
          // 2 imágenes
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 aspect-[16/9] max-h-[420px] w-full p-1.5 bg-background/50">
            {images.map((img, i) => (
              <div
                key={img.url}
                onClick={() => openLightboxAt(i)}
                className="relative h-full w-full cursor-pointer overflow-hidden rounded-2xl group"
              >
                <Image
                  src={img.url}
                  alt={`${title} - foto ${i + 1}`}
                  fill
                  sizes="50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        ) : (
          // 3 o más imágenes: Mosaico Hero (1 grande izquierda, 2 apiladas derecha)
          <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 aspect-[16/9] max-h-[420px] w-full p-1.5 bg-background/50">
            {/* Foto principal grande */}
            <div
              onClick={() => openLightboxAt(0)}
              className="relative md:col-span-8 h-full w-full cursor-pointer overflow-hidden rounded-2xl group"
            >
              <Image
                src={images[0].url}
                alt={`${title} - principal`}
                fill
                sizes="(min-width: 768px) 60vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority
              />
            </div>

            {/* Columna derecha con 2 fotos apiladas */}
            <div className="hidden md:grid md:col-span-4 grid-rows-2 gap-1.5 h-full">
              {images.slice(1, 3).map((img, i) => (
                <div
                  key={img.url}
                  onClick={() => openLightboxAt(i + 1)}
                  className="relative h-full w-full cursor-pointer overflow-hidden rounded-2xl group"
                >
                  <Image
                    src={img.url}
                    alt={`${title} - foto ${i + 2}`}
                    fill
                    sizes="30vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón flotante para ver todas las fotos */}
        <button
          type="button"
          onClick={() => openLightboxAt(0)}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-background/90 px-4 py-2 text-xs font-semibold text-foreground backdrop-blur-md shadow-md hover:bg-background transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer border border-border/60"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5-11 11" />
          </svg>
          <span>Ver todas las fotos ({images.length})</span>
        </button>
      </div>

      {/* Miniaturas navegables en la vista previa rápida */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => openLightboxAt(i)}
              className={`relative h-14 w-20 flex-none overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer ${
                i === active
                  ? "border-accent ring-2 ring-accent/20 opacity-100 scale-[0.98]"
                  : "border-border/60 opacity-60 hover:opacity-100"
              }`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Modal Lightbox a Pantalla Completa */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-4 sm:p-6 backdrop-blur-lg animate-fadeIn">
          {/* Barra Superior del Lightbox */}
          <div className="flex w-full items-center justify-between text-white/90 max-w-7xl">
            <span className="text-xs sm:text-sm font-semibold tracking-wider opacity-80">
              {active + 1} / {images.length} — {title}
            </span>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <span>Cerrar</span>
            </button>
          </div>

          {/* Área Principal de la Imagen en Lightbox */}
          <div className="relative flex h-full w-full max-w-6xl items-center justify-center py-4">
            {/* Flecha Izquierda */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setActive((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/90 hover:scale-110 transition-all cursor-pointer border border-white/20"
                aria-label="Anterior foto"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            {/* Foto Activa */}
            <div className="relative h-full w-full max-h-[75vh]">
              <Image
                src={images[active].url}
                alt={`${title} - vista completa`}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>

            {/* Flecha Derecha */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => setActive((prev) => (prev + 1) % images.length)}
                className="absolute right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/90 hover:scale-110 transition-all cursor-pointer border border-white/20"
                aria-label="Siguiente foto"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}
          </div>

          {/* Carrusel Inferior de Miniaturas del Lightbox */}
          {images.length > 1 && (
            <div className="flex gap-2 max-w-4xl overflow-x-auto p-2 no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`relative h-14 w-20 flex-none overflow-hidden rounded-lg transition-all duration-200 cursor-pointer ${
                    i === active ? "ring-2 ring-accent scale-105 opacity-100" : "opacity-40 hover:opacity-100"
                  }`}
                >
                  <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

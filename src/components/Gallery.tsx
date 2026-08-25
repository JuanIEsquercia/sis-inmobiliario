"use client";

import { useState } from "react";
import Image from "next/image";

export function Gallery({ images, title }: { images: { url: string }[]; title: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-surface/50 border border-border/40 text-sm text-muted">
        Sin fotos
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface border border-border/40 shadow-premium">
        <Image
          src={images[active].url}
          alt={title}
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover transition-all duration-500"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-20 flex-none overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer ${
                i === active 
                  ? "border-accent ring-2 ring-accent/20 scale-[0.96] opacity-100 shadow-sm" 
                  : "border-border/60 opacity-70 hover:opacity-100 hover:scale-[0.98]"
              }`}
              aria-label={`Foto ${i + 1}`}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


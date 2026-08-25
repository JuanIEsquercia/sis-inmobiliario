"use client";

import { useState } from "react";
import { ClientPicker, type ClientOption } from "./ClientPicker";

export function GuarantorFields({ initialGuarantors = [] }: { initialGuarantors?: ClientOption[] }) {
  const [count, setCount] = useState(Math.max(1, initialGuarantors.length));

  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <ClientPicker
          key={i}
          namePrefix={`guarantors.${i}`}
          roleLabel={`Garante ${i + 1}`}
          initialSelected={initialGuarantors[i] ?? null}
        />
      ))}
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="w-fit text-sm text-accent hover:underline"
      >
        + Agregar otro garante
      </button>
    </div>
  );
}

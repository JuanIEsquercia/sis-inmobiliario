"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import { useMounted } from "@/lib/use-mounted";

export function Logo() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const src = mounted && resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  return (
    <Image
      src={src}
      alt="Garcia Propiedades"
      width={4550}
      height={3371}
      priority
      className="h-10 w-auto"
    />
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import type { Profile } from "@/generated/prisma/client";

// El middleware ya redirige a /backoffice/login si no hay sesión; estos
// helpers asumen que corren dentro de /backoffice y solo resuelven el
// Profile (rol) para las rutas/acciones que lo necesitan.

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return withRetry(() => prisma.profile.findUnique({ where: { id: user.id } }));
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isActive) redirect("/backoffice/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN") redirect("/backoffice");
  return profile;
}

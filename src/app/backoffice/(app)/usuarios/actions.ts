"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requireAdmin } from "@/lib/auth";
import type { StaffRole } from "@/generated/prisma/client";

export async function updateUserRole(userId: string, role: StaffRole) {
  await requireAdmin();
  await withRetry(() => prisma.profile.update({ where: { id: userId }, data: { role } }));
  revalidatePath("/backoffice/usuarios");
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requireAdmin();
  await withRetry(() => prisma.profile.update({ where: { id: userId }, data: { isActive } }));
  revalidatePath("/backoffice/usuarios");
}

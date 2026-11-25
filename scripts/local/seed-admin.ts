// Crea (o actualiza) el usuario administrador del entorno local, con
// todos los permisos. Solo corre contra la base local: ver guard.ts.
//
// Uso: npm run local:seed-admin
//      (email y contraseña opcionales: -- correo@x.com contraseña)
import { assertLocalEnvironment } from "./guard";

assertLocalEnvironment();

const email = process.argv[2] ?? "admin@local.test";
const password = process.argv[3] ?? "admin-local-1234";
const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "_");

async function main() {
  // Imports después del guard: así nada se conecta antes de verificar.
  const { createAdminClient } = await import("../../src/lib/supabase/admin");
  const { prisma } = await import("../../src/lib/prisma");
  const { ALL_PERMISSION_KEYS } = await import("../../src/lib/permissions");

  const admin = createAdminClient();
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Usuario creado: ${email}`);
  } else {
    await admin.auth.admin.updateUserById(userId, { password });
    console.log(`Usuario ya existía, contraseña actualizada: ${email}`);
  }

  // El trigger handle_new_user crea el Profile al crear el login.
  await prisma.profile.update({
    where: { id: userId },
    // Usuario a partir del email ("admin@local.test" -> @admin) para poder
    // crear más de un admin local sin que choque el @usuario único.
    data: { role: "ADMIN", permissions: ALL_PERMISSION_KEYS, username, firstName: "Admin", lastName: "Local" },
  });
  console.log(`Perfil @${username} (${email}) con rol ADMIN y ${ALL_PERMISSION_KEYS.length} permisos. Contraseña: ${password}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

-- Profile: username + firstName/lastName (reemplaza fullName) + permisos
-- granulares. Se agrega todo nullable, se backfillea, y recien despues se
-- pone username NOT NULL para no romper con filas existentes.

ALTER TABLE "Profile" ADD COLUMN "username" TEXT;
ALTER TABLE "Profile" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: username a partir del email; sufijo corto del id si hiciera
-- falta para no chocar con el unique (poco probable con una sola fila,
-- pero correcto igual).
UPDATE "Profile"
SET "username" = lower(split_part("email", '@', 1)) || '_' || substr(replace("id"::text, '-', ''), 1, 4)
WHERE "username" IS NULL;

-- Backfill de permisos segun el rol actual.
UPDATE "Profile"
SET "permissions" = ARRAY[
  'pedidos.ver','pedidos.crear','pedidos.estado',
  'alquileres.ver','alquileres.crear','alquileres.pagos','alquileres.indexacion',
  'usuarios.ver','usuarios.gestionar'
]
WHERE "role" = 'ADMIN';

UPDATE "Profile"
SET "permissions" = ARRAY[
  'pedidos.ver','pedidos.crear','pedidos.estado',
  'alquileres.ver','alquileres.crear','alquileres.pagos'
]
WHERE "role" = 'AGENTE' AND cardinality("permissions") = 0;

ALTER TABLE "Profile" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "Profile" DROP COLUMN "fullName";

CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- El trigger ya no lee full_name de los metadatos; genera un username de
-- fallback (nuestra propia accion de alta lo pisa con el elegido en el
-- formulario apenas crea el usuario via Admin API).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."Profile" (id, email, username, role, "isActive", "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    lower(split_part(NEW.email, '@', 1)) || '_' || substr(replace(NEW.id::text, '-', ''), 1, 4),
    'AGENTE',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

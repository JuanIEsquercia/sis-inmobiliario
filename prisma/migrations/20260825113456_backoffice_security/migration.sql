-- Bloquea el acceso público de PostgREST/Supabase (via la publishable key,
-- que es publica en el bundle del cliente) a las tablas del backoffice.
-- Con RLS activo y sin policies, solo puede leer/escribir el rol dueno de
-- las tablas (la connection string de Prisma), no "anon"/"authenticated".
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Unit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Owner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Indexation" ENABLE ROW LEVEL SECURITY;

-- Crea automaticamente la fila en "Profile" (rol AGENTE por defecto)
-- cuando un admin da de alta un login nuevo en Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."Profile" (id, email, "fullName", role, "isActive", "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'AGENTE',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

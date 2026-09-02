-- Presupuestador nuevo: agrega presupuestos.ver/presupuestos.crear a
-- todos los AGENTE ya existentes, para que puedan usarlo sin que un
-- ADMIN tenga que tildarlo a mano en Usuarios para cada uno. ADMIN no
-- necesita esto: su permissions se calcula siempre en el momento (ver
-- getCurrentProfile en lib/auth.ts). presupuestos.conceptos.gestionar
-- queda fuera a propósito, mismo criterio que comisiones.gestionar.
UPDATE "Profile"
SET permissions = array_cat(
  permissions,
  ARRAY(
    SELECT unnest(ARRAY['presupuestos.ver', 'presupuestos.crear'])
    EXCEPT
    SELECT unnest(permissions)
  )
)
WHERE role = 'AGENTE';

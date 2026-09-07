-- Central de Deudores pasa a tener clave propia (central_deudores.consultar)
-- en vez de reutilizar administraciones.crear. Quien ya podía consultar
-- (tenía administraciones.crear) la recibe acá, así nadie pierde el
-- módulo hasta que un admin lo edite. Solo datos, sin cambio de schema.
UPDATE "Profile"
SET "permissions" = array_append("permissions", 'central_deudores.consultar')
WHERE 'administraciones.crear' = ANY("permissions")
  AND NOT ('central_deudores.consultar' = ANY("permissions"));

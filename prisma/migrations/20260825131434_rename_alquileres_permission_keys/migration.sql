-- El modulo "Alquileres" paso a llamarse "Administraciones" (mismo
-- contenido, solo cambia el nombre de cara al usuario). Renombra las
-- claves de permiso guardadas en Profile.permissions que empiecen con
-- "alquileres." a "administraciones." — no hay cambio de schema, solo
-- de datos.
UPDATE "Profile"
SET permissions = (
  SELECT array_agg(
    CASE
      WHEN p LIKE 'alquileres.%' THEN 'administraciones.' || substring(p FROM 12)
      ELSE p
    END
  )
  FROM unnest(permissions) AS p
)
WHERE EXISTS (
  SELECT 1 FROM unnest(permissions) AS p WHERE p LIKE 'alquileres.%'
);

-- Separado de la migración anterior a propósito: Postgres no permite
-- usar un valor de enum recién agregado dentro de la misma transacción
-- que lo agregó.
--
-- Las colocaciones (isAdministered false) ya cargadas quedaban en
-- ACTIVO (el único estado que existía hasta ahora) -- se backfillean a
-- FIRMADO, tratándolas como ya cerradas (no como borradores todavía en
-- curso), ya que son registros que ya estaban operando en el sistema.
UPDATE "Contract" SET "status" = 'FIRMADO' WHERE "isAdministered" = false AND "status" = 'ACTIVO';

-- AlterTable
-- Se puede cargar la colocación (fecha, monto, comisión) sin tener
-- todavía el nombre completo del propietario o del inquilino — se
-- completa después desde la ficha del contrato. El FK sigue intacto
-- (ON DELETE RESTRICT): un valor NULL nunca se valida contra la tabla
-- referenciada, así que no hace falta tocar la constraint.
ALTER TABLE "Contract" ALTER COLUMN "ownerId" DROP NOT NULL;
ALTER TABLE "Contract" ALTER COLUMN "tenantId" DROP NOT NULL;

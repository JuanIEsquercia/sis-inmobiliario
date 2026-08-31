-- AlterTable
ALTER TABLE "RentalCommission" ADD COLUMN "origin" "CommissionSchemeType" NOT NULL DEFAULT 'ALQUILER';

-- Backfill: comisiones ya cargadas sobre un contrato que es una
-- renovación (Contract.renewedFromContractId no nulo) se reclasifican
-- como RENOVACION — el default 'ALQUILER' de arriba ya cubre todo lo demás.
UPDATE "RentalCommission"
SET "origin" = 'RENOVACION'
WHERE "contractId" IN (
  SELECT "id" FROM "Contract" WHERE "renewedFromContractId" IS NOT NULL
);

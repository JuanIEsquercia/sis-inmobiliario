-- AlterTable: agrega las columnas nullable primero para poder backfillear
-- los contratos ya existentes antes de exigir NOT NULL en paymentDueDay.
ALTER TABLE "Contract" ADD COLUMN "paymentDueDay" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "tenantPaysCommission" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Contract" ADD COLUMN "commissionAlias" TEXT;
ALTER TABLE "Contract" ADD COLUMN "commissionCBU" TEXT;

-- Backfill: hasta ahora el vencimiento de cada cuota siempre fue el
-- mismo día que "startDate" (ver buildPaymentSchedule) -- se deja
-- documentado ese mismo día en el contrato para que quede editable,
-- en vez de nacer en null.
UPDATE "Contract" SET "paymentDueDay" = EXTRACT(DAY FROM "startDate")::int WHERE "paymentDueDay" IS NULL;

ALTER TABLE "Contract" ALTER COLUMN "paymentDueDay" SET NOT NULL;

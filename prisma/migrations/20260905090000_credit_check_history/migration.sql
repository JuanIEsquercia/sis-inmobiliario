-- DropIndex
DROP INDEX "CreditCheck_cuit_key";

-- CreateIndex
CREATE INDEX "CreditCheck_cuit_consultedAt_idx" ON "CreditCheck"("cuit", "consultedAt");

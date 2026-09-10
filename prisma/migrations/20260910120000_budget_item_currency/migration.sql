-- Bimonetario: cada BudgetItem lleva su propia moneda. Los ítems
-- existentes heredan la moneda del presupuesto al que pertenecen.
ALTER TABLE "BudgetItem" ADD COLUMN "currency" TEXT;

UPDATE "BudgetItem" bi
SET "currency" = b."currency"
FROM "Budget" b
WHERE bi."budgetId" = b."id";

ALTER TABLE "BudgetItem" ALTER COLUMN "currency" SET NOT NULL;

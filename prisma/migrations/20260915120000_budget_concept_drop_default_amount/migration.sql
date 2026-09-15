-- Se quitan los precios sugeridos del catálogo de conceptos de presupuestos.
ALTER TABLE "BudgetConcept" DROP COLUMN "defaultAmount";

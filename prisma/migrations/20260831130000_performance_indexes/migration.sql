-- Postgres no indexa automaticamente las columnas de foreign key (a
-- diferencia de las primary key/unique) — estas tres se consultan
-- seguido por su FK (historial de una liquidacion/contrato) y hacian
-- Seq Scan sobre toda la tabla.
CREATE INDEX "PaymentPartialPayment_paymentId_idx" ON "PaymentPartialPayment"("paymentId");
CREATE INDEX "Indexation_contractId_idx" ON "Indexation"("contractId");
CREATE INDEX "ContractDocument_contractId_idx" ON "ContractDocument"("contractId");

-- El listado publico siempre filtra isActive=true y ordena por
-- sourceUpdatedAt desc — sin este indice compuesto, Postgres ordena en
-- memoria (Filesort) en cada pagina. Reemplaza al indice suelto de
-- isActive (sigue sirviendo para ese caso, al ser la primera columna).
DROP INDEX "Listing_isActive_idx";
CREATE INDEX "Listing_isActive_sourceUpdatedAt_idx" ON "Listing"("isActive", "sourceUpdatedAt");

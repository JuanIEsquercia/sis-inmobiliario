-- % aplicado en la actualización -- se carga el % en vez del monto
-- directo, este campo es lo que se reimprime como comprobante.
ALTER TABLE "Indexation" ADD COLUMN "percentage" DECIMAL(6,2);

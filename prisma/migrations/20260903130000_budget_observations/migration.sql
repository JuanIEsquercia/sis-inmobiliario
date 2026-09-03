-- Observaciones del presupuesto que SÍ salen impresas (a diferencia de
-- "notes", que es solo para uso interno).
ALTER TABLE "Budget" ADD COLUMN "observations" TEXT;

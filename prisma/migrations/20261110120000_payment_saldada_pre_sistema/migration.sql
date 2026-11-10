-- Marca las liquidaciones de meses que se cobraron por fuera del sistema,
-- antes de que el contrato se cargara acá. Default false: todo lo que ya
-- existe sigue exactamente igual. Ver el comentario en Payment.
ALTER TABLE "Payment" ADD COLUMN "saldadaPreSistema" BOOLEAN NOT NULL DEFAULT false;

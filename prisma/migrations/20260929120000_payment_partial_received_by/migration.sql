-- A quién le llegó la plata del alquiler: dato nuevo, distinto del medio
-- de pago. Ver el comentario del enum PaymentRecipient en schema.prisma.
CREATE TYPE "PaymentRecipient" AS ENUM ('INMOBILIARIA', 'PROPIETARIO');

-- Nullable y sin backfill a propósito: un cobro cargado antes de que
-- este campo existiera no tiene forma de saber a quién le entró, y
-- adivinarlo sería inventar un registro. null = "no registrado".
ALTER TABLE "PaymentPartialPayment" ADD COLUMN "receivedBy" "PaymentRecipient";

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'CARGADA' AFTER 'PENDIENTE';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "loadedAt" TIMESTAMP(3);

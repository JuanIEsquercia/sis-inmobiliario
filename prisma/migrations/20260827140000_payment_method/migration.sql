-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN "method" "PaymentMethod";

-- AlterTable
ALTER TABLE "PaymentPartialPayment" ADD COLUMN "method" "PaymentMethod";

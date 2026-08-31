-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "ownerPaidAt" TIMESTAMP(3),
ADD COLUMN "ownerPaymentMethod" "PaymentMethod";

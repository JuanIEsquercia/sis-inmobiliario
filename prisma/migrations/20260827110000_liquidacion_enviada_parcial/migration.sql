-- RenameEnumValue (CARGADA pasa a llamarse ENVIADA, mismo significado)
ALTER TYPE "PaymentStatus" RENAME VALUE 'CARGADA' TO 'ENVIADA';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PARCIAL';

-- RenameColumn
ALTER TABLE "Payment" RENAME COLUMN "loadedAt" TO "sentAt";

-- CreateTable
CREATE TABLE "PaymentPartialPayment" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentPartialPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentPartialPayment" ADD CONSTRAINT "PaymentPartialPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

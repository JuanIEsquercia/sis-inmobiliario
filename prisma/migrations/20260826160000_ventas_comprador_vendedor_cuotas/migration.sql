-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDIENTE', 'PAGADA');

-- CreateEnum
CREATE TYPE "PagareSigner" AS ENUM ('COMPRADOR', 'VENDEDOR');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "sellerId" INTEGER,
ADD COLUMN "buyerId" INTEGER,
ADD COLUMN "initialPriceAmount" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN "saleCommissionInstallmentId" INTEGER;

-- CreateTable
CREATE TABLE "SaleCommissionInstallment" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "totalCuotas" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "paidAt" TIMESTAMP(3),
    "pagareSignedBy" "PagareSigner",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleCommissionInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleCommissionInstallment_saleId_numeroCuota_key" ON "SaleCommissionInstallment"("saleId", "numeroCuota");

-- CreateIndex
CREATE INDEX "SaleCommissionInstallment_status_idx" ON "SaleCommissionInstallment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_saleCommissionInstallmentId_key" ON "CashMovement"("saleCommissionInstallmentId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleCommissionInstallment" ADD CONSTRAINT "SaleCommissionInstallment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_saleCommissionInstallmentId_fkey" FOREIGN KEY ("saleCommissionInstallmentId") REFERENCES "SaleCommissionInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

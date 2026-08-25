-- CreateEnum
CREATE TYPE "CashMovementSource" AS ENUM ('ADMINISTRACION', 'COMISION_ALQUILER', 'VENTA', 'TASACION');

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" SERIAL NOT NULL,
    "source" "CashMovementSource" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentId" INTEGER,
    "rentalCommissionId" INTEGER,
    "saleId" INTEGER,
    "appraisalId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalCommission" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" UUID NOT NULL,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" SERIAL NOT NULL,
    "unitId" INTEGER NOT NULL,
    "saleAmount" DECIMAL(14,2),
    "commissionAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" UUID NOT NULL,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appraisal" (
    "id" SERIAL NOT NULL,
    "unitId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" UUID NOT NULL,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appraisal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_paymentId_key" ON "CashMovement"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_rentalCommissionId_key" ON "CashMovement"("rentalCommissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_saleId_key" ON "CashMovement"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_appraisalId_key" ON "CashMovement"("appraisalId");

-- CreateIndex
CREATE INDEX "CashMovement_source_idx" ON "CashMovement"("source");

-- CreateIndex
CREATE INDEX "CashMovement_occurredAt_idx" ON "CashMovement"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentalCommission_contractId_key" ON "RentalCommission"("contractId");

-- CreateIndex
CREATE INDEX "Sale_unitId_idx" ON "Sale"("unitId");

-- CreateIndex
CREATE INDEX "Appraisal_unitId_idx" ON "Appraisal"("unitId");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_rentalCommissionId_fkey" FOREIGN KEY ("rentalCommissionId") REFERENCES "RentalCommission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "Appraisal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: mismo criterio que el resto de las tablas del backoffice — sin
-- políticas, solo para bloquear la exposición automática vía PostgREST
-- con la publishable key. La autorización real vive en application code.
ALTER TABLE "CashMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentalCommission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appraisal" ENABLE ROW LEVEL SECURITY;

-- Invariante no expresable en schema.prisma (sin @@check habilitado):
-- CashMovement debe tener EXACTAMENTE un FK de fuente seteado, acorde
-- al valor de `source`.
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_source_fk_check" CHECK (
  (source = 'ADMINISTRACION' AND "paymentId" IS NOT NULL AND "rentalCommissionId" IS NULL AND "saleId" IS NULL AND "appraisalId" IS NULL) OR
  (source = 'COMISION_ALQUILER' AND "rentalCommissionId" IS NOT NULL AND "paymentId" IS NULL AND "saleId" IS NULL AND "appraisalId" IS NULL) OR
  (source = 'VENTA' AND "saleId" IS NOT NULL AND "paymentId" IS NULL AND "rentalCommissionId" IS NULL AND "appraisalId" IS NULL) OR
  (source = 'TASACION' AND "appraisalId" IS NOT NULL AND "paymentId" IS NULL AND "rentalCommissionId" IS NULL AND "saleId" IS NULL)
);


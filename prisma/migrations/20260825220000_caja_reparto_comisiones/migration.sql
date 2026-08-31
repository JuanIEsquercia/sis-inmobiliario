-- CreateEnum
CREATE TYPE "CommissionSchemeType" AS ENUM ('VENTA', 'ALQUILER');

-- DropForeignKey
ALTER TABLE "Appraisal" DROP CONSTRAINT "Appraisal_agentId_fkey";

-- DropForeignKey
ALTER TABLE "RentalCommission" DROP CONSTRAINT "RentalCommission_agentId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_agentId_fkey";

-- AlterTable
ALTER TABLE "Appraisal" ADD COLUMN     "agentAmount" DECIMAL(14,2),
ADD COLUMN     "agentSharePercent" DECIMAL(5,2),
ALTER COLUMN "agentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RentalCommission" DROP COLUMN "agentId",
ADD COLUMN     "agenciaAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "agenteFijoAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "captadorAgentId" UUID NOT NULL,
ADD COLUMN     "captadorAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "commissionSchemeId" INTEGER NOT NULL,
ADD COLUMN     "reservaAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "vendedorAgentId" UUID NOT NULL,
ADD COLUMN     "vendedorAmount" DECIMAL(14,2) NOT NULL;

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "agentId",
ADD COLUMN     "agenciaAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "agenteFijoAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "captadorAgentId" UUID NOT NULL,
ADD COLUMN     "captadorAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "commissionSchemeId" INTEGER NOT NULL,
ADD COLUMN     "reservaAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "vendedorAgentId" UUID NOT NULL,
ADD COLUMN     "vendedorAmount" DECIMAL(14,2) NOT NULL;

-- CreateTable
CREATE TABLE "CommissionScheme" (
    "id" SERIAL NOT NULL,
    "type" "CommissionSchemeType" NOT NULL,
    "reservaPercent" DECIMAL(5,2) NOT NULL,
    "agenteFijoPercent" DECIMAL(5,2) NOT NULL,
    "agenteFijoId" UUID NOT NULL,
    "vendedorPercent" DECIMAL(5,2) NOT NULL,
    "captadorPercent" DECIMAL(5,2) NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionScheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionScheme_type_vigenteDesde_idx" ON "CommissionScheme"("type", "vigenteDesde");

-- AddForeignKey
ALTER TABLE "CommissionScheme" ADD CONSTRAINT "CommissionScheme_agenteFijoId_fkey" FOREIGN KEY ("agenteFijoId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionScheme" ADD CONSTRAINT "CommissionScheme_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_vendedorAgentId_fkey" FOREIGN KEY ("vendedorAgentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_captadorAgentId_fkey" FOREIGN KEY ("captadorAgentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_commissionSchemeId_fkey" FOREIGN KEY ("commissionSchemeId") REFERENCES "CommissionScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_vendedorAgentId_fkey" FOREIGN KEY ("vendedorAgentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_captadorAgentId_fkey" FOREIGN KEY ("captadorAgentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_commissionSchemeId_fkey" FOREIGN KEY ("commissionSchemeId") REFERENCES "CommissionScheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

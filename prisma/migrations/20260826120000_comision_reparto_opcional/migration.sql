-- DropForeignKey
ALTER TABLE "RentalCommission" DROP CONSTRAINT "RentalCommission_commissionSchemeId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_commissionSchemeId_fkey";

-- AlterTable
ALTER TABLE "RentalCommission" ALTER COLUMN "agenciaAmount" DROP NOT NULL,
ALTER COLUMN "agenteFijoAmount" DROP NOT NULL,
ALTER COLUMN "captadorAmount" DROP NOT NULL,
ALTER COLUMN "commissionSchemeId" DROP NOT NULL,
ALTER COLUMN "reservaAmount" DROP NOT NULL,
ALTER COLUMN "vendedorAmount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "agenciaAmount" DROP NOT NULL,
ALTER COLUMN "agenteFijoAmount" DROP NOT NULL,
ALTER COLUMN "captadorAmount" DROP NOT NULL,
ALTER COLUMN "commissionSchemeId" DROP NOT NULL,
ALTER COLUMN "reservaAmount" DROP NOT NULL,
ALTER COLUMN "vendedorAmount" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_commissionSchemeId_fkey" FOREIGN KEY ("commissionSchemeId") REFERENCES "CommissionScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_commissionSchemeId_fkey" FOREIGN KEY ("commissionSchemeId") REFERENCES "CommissionScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "RentalCommission" DROP CONSTRAINT "RentalCommission_captadorAgentId_fkey";

-- DropForeignKey
ALTER TABLE "RentalCommission" DROP CONSTRAINT "RentalCommission_vendedorAgentId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_captadorAgentId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_vendedorAgentId_fkey";

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "isAdministered" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "managementFeePercent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RentalCommission" ALTER COLUMN "captadorAgentId" DROP NOT NULL,
ALTER COLUMN "vendedorAgentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "captadorAgentId" DROP NOT NULL,
ALTER COLUMN "vendedorAgentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_vendedorAgentId_fkey" FOREIGN KEY ("vendedorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalCommission" ADD CONSTRAINT "RentalCommission_captadorAgentId_fkey" FOREIGN KEY ("captadorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_vendedorAgentId_fkey" FOREIGN KEY ("vendedorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_captadorAgentId_fkey" FOREIGN KEY ("captadorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

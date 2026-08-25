-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Guarantor" DROP CONSTRAINT "Guarantor_contractId_fkey";

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "paymentAlias" TEXT,
ADD COLUMN     "paymentCBU" TEXT,
ADD COLUMN     "renewedFromContractId" INTEGER,
ADD COLUMN     "terminatedAt" TIMESTAMP(3),
ADD COLUMN     "terminationReason" TEXT;

-- DropTable
DROP TABLE "Guarantor";

-- DropTable
DROP TABLE "Owner";

-- DropTable
DROP TABLE "Tenant";

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "docId" TEXT,
    "birthDate" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractGuarantor" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractGuarantor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_docId_idx" ON "Client"("docId");

-- CreateIndex
CREATE INDEX "Client_lastName_firstName_idx" ON "Client"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "ContractGuarantor_contractId_clientId_key" ON "ContractGuarantor"("contractId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_propertyCode_key" ON "Unit"("propertyCode");

-- AddForeignKey
ALTER TABLE "ContractGuarantor" ADD CONSTRAINT "ContractGuarantor_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractGuarantor" ADD CONSTRAINT "ContractGuarantor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_renewedFromContractId_fkey" FOREIGN KEY ("renewedFromContractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;


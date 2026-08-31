-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "vendedorAgentId" UUID,
ADD COLUMN "captadorAgentId" UUID;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_vendedorAgentId_fkey" FOREIGN KEY ("vendedorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_captadorAgentId_fkey" FOREIGN KEY ("captadorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

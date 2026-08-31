-- DropTable (reemplazado por AgentDebtPayment, imputado a cada línea de
-- deuda en vez de un total suelto — sin datos reales todavía)
DROP TABLE "AgentPayment";

-- CreateEnum
CREATE TYPE "AgentDebtSource" AS ENUM ('RENTAL_COMMISSION', 'SALE', 'APPRAISAL');

-- CreateEnum
CREATE TYPE "AgentDebtRole" AS ENUM ('VENDEDOR', 'CAPTADOR', 'AGENTE_FIJO', 'TASACION');

-- CreateTable
CREATE TABLE "AgentDebtPayment" (
    "id" SERIAL NOT NULL,
    "agentId" UUID NOT NULL,
    "sourceType" "AgentDebtSource" NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "role" "AgentDebtRole" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentDebtPayment_agentId_idx" ON "AgentDebtPayment"("agentId");

-- CreateIndex
CREATE INDEX "AgentDebtPayment_sourceType_sourceId_role_idx" ON "AgentDebtPayment"("sourceType", "sourceId", "role");

-- AddForeignKey
ALTER TABLE "AgentDebtPayment" ADD CONSTRAINT "AgentDebtPayment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentDebtPayment" ADD CONSTRAINT "AgentDebtPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

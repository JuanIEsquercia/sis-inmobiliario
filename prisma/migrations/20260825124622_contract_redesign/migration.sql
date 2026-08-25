-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CONTRATO', 'DNI_INQUILINO', 'DNI_GARANTE', 'OTRO');

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "indexationType",
ADD COLUMN     "durationMonths" INTEGER NOT NULL,
ADD COLUMN     "indexTypeId" INTEGER;

-- AlterTable
ALTER TABLE "Indexation" DROP COLUMN "index",
ADD COLUMN     "indexTypeId" INTEGER;

-- AlterTable
ALTER TABLE "Owner" DROP COLUMN "fullName",
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amount";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "fullName",
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ALTER COLUMN "docId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Guarantor" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "docId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contractId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guarantor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexType" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractConcept" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "conceptId" INTEGER NOT NULL,

    CONSTRAINT "ContractConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentItem" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "conceptId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2),
    "notes" TEXT,

    CONSTRAINT "PaymentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndexType_code_key" ON "IndexType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_name_key" ON "Concept"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ContractConcept_contractId_conceptId_key" ON "ContractConcept"("contractId", "conceptId");

-- CreateIndex
CREATE INDEX "PaymentItem_paymentId_idx" ON "PaymentItem"("paymentId");

-- AddForeignKey
ALTER TABLE "Guarantor" ADD CONSTRAINT "Guarantor_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractConcept" ADD CONSTRAINT "ContractConcept_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractConcept" ADD CONSTRAINT "ContractConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_indexTypeId_fkey" FOREIGN KEY ("indexTypeId") REFERENCES "IndexType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentItem" ADD CONSTRAINT "PaymentItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentItem" ADD CONSTRAINT "PaymentItem_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indexation" ADD CONSTRAINT "Indexation_indexTypeId_fkey" FOREIGN KEY ("indexTypeId") REFERENCES "IndexType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: conceptos y tipos de indice base para que los formularios ya
-- tengan opciones desde el arranque. "Alquiler" es isSystem = no se
-- puede borrar, es el concepto implicito de toda liquidacion.
INSERT INTO "Concept" ("name", "isSystem") VALUES
  ('Alquiler', true),
  ('Expensas', false),
  ('Agua', false),
  ('Luz', false),
  ('CSP', false),
  ('Mora', false);

INSERT INTO "IndexType" ("code") VALUES
  ('ICL'),
  ('CAC'),
  ('IPC');


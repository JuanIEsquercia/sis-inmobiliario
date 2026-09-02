-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('ALQUILER', 'VENTA');

-- CreateEnum
CREATE TYPE "BudgetRecipient" AS ENUM ('INQUILINO', 'COMPRADOR', 'PROPIETARIO');

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "type" "BudgetType" NOT NULL,
    "unitDetail" TEXT NOT NULL,
    "tenantName" TEXT,
    "buyerName" TEXT,
    "ownerName" TEXT,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" SERIAL NOT NULL,
    "budgetId" INTEGER NOT NULL,
    "recipient" "BudgetRecipient" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetConcept" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "defaultAmount" DECIMAL(14,2),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_type_idx" ON "Budget"("type");

-- CreateIndex
CREATE INDEX "Budget_createdById_idx" ON "Budget"("createdById");

-- CreateIndex
CREATE INDEX "BudgetItem_budgetId_idx" ON "BudgetItem"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetConcept_name_key" ON "BudgetConcept"("name");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetConcept" ADD CONSTRAINT "BudgetConcept_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sin policies, solo bloquea el acceso público de PostgREST con la
-- publishable key -- todo se lee/escribe server-side con Prisma, mismo
-- criterio que el resto de las tablas del backoffice.
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetConcept" ENABLE ROW LEVEL SECURITY;

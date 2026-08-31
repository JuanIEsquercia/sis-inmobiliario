-- CreateTable
CREATE TABLE "AgentPayment" (
    "id" SERIAL NOT NULL,
    "agentId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentPayment_agentId_idx" ON "AgentPayment"("agentId");

-- AddForeignKey
ALTER TABLE "AgentPayment" ADD CONSTRAINT "AgentPayment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPayment" ADD CONSTRAINT "AgentPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

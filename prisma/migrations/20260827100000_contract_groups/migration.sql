-- AlterTable
ALTER TABLE "Contract" ADD COLUMN "groupId" INTEGER;

-- CreateTable
CREATE TABLE "ContractGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileContractGroup" (
    "id" SERIAL NOT NULL,
    "profileId" UUID NOT NULL,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileContractGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractGroup_name_key" ON "ContractGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileContractGroup_profileId_groupId_key" ON "ProfileContractGroup"("profileId", "groupId");

-- CreateIndex
CREATE INDEX "Contract_groupId_idx" ON "Contract"("groupId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContractGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractGroup" ADD CONSTRAINT "ContractGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileContractGroup" ADD CONSTRAINT "ProfileContractGroup_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileContractGroup" ADD CONSTRAINT "ProfileContractGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContractGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

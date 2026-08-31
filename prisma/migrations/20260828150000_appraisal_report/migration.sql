-- AlterTable
ALTER TABLE "Appraisal" ADD COLUMN "reportFileName" TEXT,
ADD COLUMN "reportStoragePath" TEXT,
ADD COLUMN "reportUploadedAt" TIMESTAMP(3),
ADD COLUMN "reportUploadedById" UUID;

-- AddForeignKey
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_reportUploadedById_fkey" FOREIGN KEY ("reportUploadedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "code" VARCHAR(50);

-- CreateIndex
CREATE INDEX "Listing_code_idx" ON "Listing"("code");

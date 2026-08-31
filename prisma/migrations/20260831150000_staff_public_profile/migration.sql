-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "phone" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "photoStoragePath" TEXT,
ADD COLUMN "showOnPublicSite" BOOLEAN NOT NULL DEFAULT false;

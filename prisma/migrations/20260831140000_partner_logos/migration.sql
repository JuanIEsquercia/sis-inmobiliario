-- CreateTable
CREATE TABLE "PartnerLogo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerLogo_isActive_sortOrder_idx" ON "PartnerLogo"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "PartnerLogo" ADD CONSTRAINT "PartnerLogo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sin policies, solo bloquea el acceso público de PostgREST con la
-- publishable key — el sitio público lee esta tabla server-side con
-- Prisma (misma conexión dueña de la tabla), igual que Listing/Agency.
ALTER TABLE "PartnerLogo" ENABLE ROW LEVEL SECURITY;

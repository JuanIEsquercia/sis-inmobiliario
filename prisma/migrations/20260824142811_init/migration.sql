-- CreateTable
CREATE TABLE "Agency" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "officeAddress" TEXT,
    "officeZipCode" TEXT,
    "phones" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "title" TEXT NOT NULL,
    "contentTitle" TEXT,
    "description" TEXT,
    "operationType" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "priceAmount" DECIMAL(14,2),
    "priceCurrency" TEXT,
    "priceRaw" TEXT,
    "pricePerHectare" DECIMAL(14,2),
    "expenses" DECIMAL(14,2),
    "address" TEXT,
    "addressName" TEXT,
    "addressNumber" TEXT,
    "addressFloor" TEXT,
    "addressApartment" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "neighborhood" TEXT,
    "postcode" TEXT,
    "latitude" DECIMAL(11,8),
    "longitude" DECIMAL(11,8),
    "orientation" TEXT,
    "floorArea" DECIMAL(10,2),
    "plotArea" DECIMAL(10,2),
    "landArea" DECIMAL(10,2),
    "rooms" INTEGER,
    "bathrooms" INTEGER,
    "condition" TEXT,
    "year" INTEGER,
    "isNew" BOOLEAN,
    "buildingFloors" INTEGER,
    "buildingMainElevators" INTEGER,
    "buildingType" TEXT,
    "buildingCategory" TEXT,
    "coveredGarages" INTEGER,
    "aptoCredito" BOOLEAN,
    "fieldLength" DECIMAL(10,2),
    "fieldWidth" DECIMAL(10,2),
    "accessDetail" TEXT,
    "distancePavement" DECIMAL(10,2),
    "countryType" TEXT,
    "services" TEXT[],
    "otherData" TEXT[],
    "sellerName" TEXT,
    "sellerEmail" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rawData" JSONB NOT NULL,
    "agencyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingImage" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingVideo" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ListingVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastModified" TEXT,
    "etag" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_externalId_key" ON "Agency"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_externalId_key" ON "Listing"("externalId");

-- CreateIndex
CREATE INDEX "Listing_operationType_idx" ON "Listing"("operationType");

-- CreateIndex
CREATE INDEX "Listing_propertyType_idx" ON "Listing"("propertyType");

-- CreateIndex
CREATE INDEX "Listing_city_idx" ON "Listing"("city");

-- CreateIndex
CREATE INDEX "Listing_isActive_idx" ON "Listing"("isActive");

-- CreateIndex
CREATE INDEX "ListingImage_listingId_idx" ON "ListingImage"("listingId");

-- CreateIndex
CREATE INDEX "ListingVideo_listingId_idx" ON "ListingVideo"("listingId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingVideo" ADD CONSTRAINT "ListingVideo_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

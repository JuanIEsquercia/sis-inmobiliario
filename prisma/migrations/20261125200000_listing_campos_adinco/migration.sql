-- Ficha con los mismos campos que el formulario de carga de Adinco.
-- Las fichas que ya vinieron de Adinco se completan con un sync forzado
-- (npm run sync -- --force): el parser ahora lee estos campos del XML y
-- reparte instalaciones y amenities en sus listas.

ALTER TABLE "Listing"
ADD COLUMN "installations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "buildingServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "buildingAmenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "propertySubtype" TEXT,
ADD COLUMN "hidePrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "expensesApproximate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aptoProfesional" BOOLEAN,
ADD COLUMN "aceptaMascotas" BOOLEAN,
ADD COLUMN "ocupada" BOOLEAN,
ADD COLUMN "depositMonths" INTEGER,
ADD COLUMN "taxesPaidBy" TEXT,
ADD COLUMN "waterPaidBy" TEXT,
ADD COLUMN "gatedCommunity" BOOLEAN,
ADD COLUMN "showExactAddress" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "betweenStreet1" TEXT,
ADD COLUMN "betweenStreet2" TEXT,
ADD COLUMN "nearStreet" TEXT,
ADD COLUMN "uncoveredArea" DECIMAL(10,2),
ADD COLUMN "backyardArea" DECIMAL(10,2),
ADD COLUMN "ageYears" INTEGER,
ADD COLUMN "floorsCount" INTEGER,
ADD COLUMN "hotWater" TEXT,
ADD COLUMN "disposition" TEXT,
ADD COLUMN "heating" TEXT,
ADD COLUMN "buildingApartmentsPerFloor" INTEGER,
ADD COLUMN "buildingServiceElevators" INTEGER,
ADD COLUMN "garageOptional" BOOLEAN,
ADD COLUMN "openGarages" INTEGER,
ADD COLUMN "semiCoveredGarages" INTEGER,
ADD COLUMN "virtualTourUrl" TEXT;
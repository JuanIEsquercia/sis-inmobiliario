-- Migración de Adinco, L1: origen de la ficha y copia propia de las fotos.

-- Quién mantiene la ficha: ADINCO (el sync) o PROPIA (nuestro sistema).
-- Todo lo existente vino del XML, por eso el default.
CREATE TYPE "ListingOrigin" AS ENUM ('ADINCO', 'PROPIA');
ALTER TABLE "Listing" ADD COLUMN "origin" "ListingOrigin" NOT NULL DEFAULT 'ADINCO';

-- Ruta base de la copia en Supabase Storage (bucket "propiedades").
ALTER TABLE "ListingImage" ADD COLUMN "storagePath" TEXT;
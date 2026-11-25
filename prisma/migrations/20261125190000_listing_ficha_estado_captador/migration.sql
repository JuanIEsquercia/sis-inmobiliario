-- Migración de Adinco, L2: ficha de propiedad con datos internos.

CREATE TYPE "ListingStatus" AS ENUM ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ALQUILADA', 'SUSPENDIDA');

ALTER TABLE "Listing" ADD COLUMN "status" "ListingStatus" NOT NULL DEFAULT 'DISPONIBLE',
ADD COLUMN "statusChangedAt" TIMESTAMP(3),
ADD COLUMN "captadorAgentId" UUID,
ADD COLUMN "internalNotes" TEXT,
ADD COLUMN "createdById" UUID;

CREATE INDEX "Listing_status_idx" ON "Listing"("status");
CREATE INDEX "Listing_captadorAgentId_idx" ON "Listing"("captadorAgentId");

ALTER TABLE "Listing" ADD CONSTRAINT "Listing_captadorAgentId_fkey" FOREIGN KEY ("captadorAgentId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Contador de códigos de propiedad propios (ver siguienteCodigoPropio en
-- src/lib/propiedades.ts). Arranca en 0: al asignar, el código se lleva
-- primero al máximo usado entre Listing y Unit, así nunca repite uno
-- existente aunque Adinco siga numerando hasta el corte.
CREATE SEQUENCE "listing_code_seq" START 1 MINVALUE 0;

-- Permisos nuevos (src/lib/permissions.ts): los administradores reciben
-- los tres, el resto de los usuarios puede ver las fichas.
UPDATE "Profile"
SET "permissions" = array(SELECT DISTINCT unnest("permissions" || ARRAY['propiedades.ver', 'propiedades.editar', 'propiedades.publicar']))
WHERE "role" = 'ADMIN';

UPDATE "Profile"
SET "permissions" = array(SELECT DISTINCT unnest("permissions" || ARRAY['propiedades.ver']))
WHERE "role" <> 'ADMIN';
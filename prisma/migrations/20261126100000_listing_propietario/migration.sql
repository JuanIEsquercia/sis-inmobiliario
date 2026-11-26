-- Propietario de la propiedad en la ficha (vinculado a Clientes).
ALTER TABLE "Listing" ADD COLUMN "ownerClientId" INTEGER;
CREATE INDEX "Listing_ownerClientId_idx" ON "Listing"("ownerClientId");
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ownerClientId_fkey" FOREIGN KEY ("ownerClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
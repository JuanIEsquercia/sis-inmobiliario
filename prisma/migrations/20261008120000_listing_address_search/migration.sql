-- Buscador por calle o zona en el sitio público.
--
-- Columna derivada de "address", ya normalizada para comparar: sin
-- tildes, sin eñes y en minúscula. Hace falta porque nadie escribe las
-- tildes en un buscador: "espana" no encontraba "España 1000" ni
-- "junin" encontraba "Junín 2300", y acá eso deja afuera varias calles.
ALTER TABLE "Listing" ADD COLUMN "addressSearch" TEXT;

-- El relleno inicial se hace con un script (ver normalizeForSearch), no
-- acá: tiene que dar EXACTAMENTE el mismo resultado que el que usa el
-- sync de ahora en más, y repetir esa lógica en SQL es garantizar que
-- las dos versiones se separen con el tiempo.
--
-- Además el sync saltea los avisos que no cambiaron en el feed, así que
-- sin ese relleno las propiedades que no se modifiquen nunca tendrían la
-- columna vacía y no aparecerían en ninguna búsqueda.
CREATE INDEX "Listing_addressSearch_idx" ON "Listing"("addressSearch");

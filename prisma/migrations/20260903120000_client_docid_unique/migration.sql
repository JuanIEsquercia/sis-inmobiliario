-- Respaldo final contra duplicados de cliente por DNI (ya bloqueados a
-- nivel de aplicación en resolveClient) -- cubre la carrera de dos
-- altas simultáneas con el mismo DNI. Postgres no choca dos NULL entre
-- sí, así que sigue permitiendo cualquier cantidad de clientes sin DNI
-- cargado todavía.
DROP INDEX "Client_docId_idx";
CREATE UNIQUE INDEX "Client_docId_key" ON "Client"("docId");

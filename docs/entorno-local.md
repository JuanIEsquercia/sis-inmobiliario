# Entorno local (prototipo de la migración de Adinco)

Copia completa del sistema en la PC (base Postgres, login y Storage de Supabase) corriendo en Docker. Sirve para probar la migración de Adinco y los módulos nuevos sin tocar producción ni pagar planes.

## Cómo se separa de producción

- `.env` sigue siendo producción y no se modifica.
- `.env.localdb` (no se sube al repo) apunta al Supabase local. Lo usan **solo** los comandos `npm run local:*`.
- Los scripts de `scripts/local/` verifican con `guard.ts` que la base y Supabase sean de esta PC; si no, cortan sin ejecutar nada.
- `npm run dev`, `npm run sync` y `npx prisma ...` sin prefijo siguen usando `.env` (producción). Para el entorno local usar siempre los `local:*`.

## Primera vez

1. Abrir Docker Desktop.
2. `npm run local:start` — levanta Supabase (la primera vez descarga imágenes, varios minutos).
3. `npm run local:env` — genera `.env.localdb`.
4. `npm run local:migrate` — aplica todas las migraciones a la base local.
5. `npm run local:seed-admin` — crea `admin@local.test` / `admin-local-1234` con todos los permisos.
6. `npm run local:dev` — sitio en http://localhost:3000 y backoffice en http://localhost:3000/backoffice.

`local:start` levanta solo lo que usa el sistema: base, login (gotrue), Storage, API (postgrest) y el gateway (kong). El panel web de Supabase, los logs y las funciones quedan afuera porque pesan varios GB y no hacen falta; para ver la base se usa `npm run local:studio`.

## Día a día

- Levantar: Docker Desktop abierto → `npm run local:start` → `npm run local:dev`.
- Apagar: `npm run local:stop` (los datos quedan guardados en Docker).
- Ver la base: `npm run local:studio`.
- Si `prisma generate` falla con `EPERM`, cerrar el `next dev` que esté corriendo y repetir.

## Propiedades y fotos (migración de Adinco)

1. `npm run respaldo -- --fotos` — guarda el XML del feed y todas las fotos originales en `respaldos/` (no toca ninguna base; se puede cortar y retomar).
2. `npm run local:importar -- respaldos/feed/<archivo>.xml` — importa ese XML a la base local.
3. `npm run local:copiar-fotos` — copia las fotos al Storage local (máx. 8 por propiedad, recortadas, en WebP) e informa cuánto ocupan.

## Empezar de cero

`npx supabase db reset` borra la base local (solo la local) y después se repiten los pasos 4 y 5.

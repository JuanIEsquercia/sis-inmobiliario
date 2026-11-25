# Migrar las propiedades de Adinco a nuestra base y dejar Adinco

_Plan armado el 2026-11-25 en una sesión de Claude Code en la nube. Estado: propuesta, nada implementado todavía._

## Contexto

Hoy Adinco es la fuente de las propiedades: se cargan allá, Adinco las publica en portales (Zonaprop, Argenprop, MercadoLibre, etc.) y genera un XML que nuestro sistema lee todos los días (`/api/sync`, cron 21:00 UTC → `src/lib/sync.ts` + `src/lib/feed.ts`). La idea es quedarse con todos los datos en nuestra base y dejar de pagar Adinco.

## Respuestas a las preguntas

**¿Tengo el link del XML?** No. Vive en la variable de entorno `ADINCO_FEED_URL` (Vercel → Settings → Environment Variables, y en tu `.env` de la PC principal). El repo solo tiene el formato: `https://feeds.adinco.net/[agency-id]/[token]/ar_adinco.xml`. No lo necesito para planificar.

**¿Qué datos se recuperan?** Casi todo ya está en nuestra base hoy. El sync guarda cada aviso en `Listing` con unos 50 campos (título, descripción, operación, tipo, precio y moneda, expensas, dirección completa, ciudad, barrio, coordenadas, superficies, dormitorios, baños, antigüedad, cocheras, apto crédito, servicios, datos de campo, vendedor, fecha) y además **`rawData`, el `<ad>` completo tal cual vino**, así que ningún campo del XML se pierde aunque no tenga columna propia. Fotos y videos quedan en `ListingImage` / `ListingVideo`.

**¿Las imágenes se pueden guardar?** Sí, pero **hoy no las tenemos**: guardamos solo el link al CDN de Adinco (`static1.adinco.net`). Si se da de baja Adinco, es muy probable que esos links dejen de funcionar y el sitio quede sin fotos. El XML trae la URL de cada foto, y Adinco sirve 5 tamaños de cada una (ver `src/lib/adinco-images.ts`). Se pueden descargar y guardar en nuestro Supabase Storage. Estimado: unas 1.664 fotos; guardando 3 tamaños (grande, mediano, chico) son unos 120 MB, y con los 5, unos 260 MB.

**¿Qué se pierde?**
1. **Publicación en portales** (confirmaste que la usan). Es lo más importante: sin Adinco, las propiedades dejan de aparecer automáticamente en Zonaprop/Argenprop/MercadoLibre.
2. **Las fotos**, si no se copian antes de la baja (punto anterior).
3. **La herramienta para cargar y editar propiedades.** Hoy nuestro sistema solo lee el XML; no tiene una pantalla para dar de alta una propiedad nueva.
4. Lo que Adinco no pone en el XML: consultas de interesados, estadísticas de visitas, historial de cambios, notas internas. Hay que pedirle a Adinco una exportación de eso si interesa.
5. El link `sourceUrl` a la ficha en Adinco (sin importancia).

**¿Es posible?** Sí. La base ya está bien estructurada para esto. Lo que falta es: copiar las fotos, que nuestro sistema pueda crear y editar propiedades propias, y resolver los portales.

## Sobre poner todo "Vigente" para capturar

Funciona para que el XML traiga todo, pero con dos cuidados:
- **Mientras estén vigentes, Adinco las publica en los portales** y nuestro sync las muestra en inmogp.com. Hacerlo en una ventana corta y, si Adinco lo permite, pausando la difusión a portales.
- **No dejar que corra el sync normal** en esa ventana (cron 18:00 hora Argentina). La captura se hace con un script aparte que guarda una copia del XML y no toca lo publicado.

## Plan (por fases)

Regla vigente: desde esta sesión no se toca la base. Todo cambio de esquema se escribe en `docs/pendientes-bd.md` para aplicarlo desde Antigravity en `main`, y el código que dependa de él no se mergea antes.

### Fase 0 — Seguro inmediato (sin cambios de base)
- Script `scripts/respaldo-feed.ts`: descarga el XML (usa `ADINCO_FEED_URL`) y lo guarda tal cual, con fecha, como archivo de respaldo. Se corre desde la PC principal (ahí están las variables), antes y durante la ventana "todo Vigente".
- El mismo script puede descargar todas las fotos del XML (los 5 tamaños, o 3) a una carpeta local como respaldo. Reutiliza `parseFeed` de `src/lib/feed.ts` y `adincoImage` de `src/lib/adinco-images.ts`.

### Fase 1 — Fotos en nuestro Storage (requiere cambio de base)
- Pendiente BD: columna `storagePath` (o similar) en `ListingImage` y bucket público `propiedades` en Supabase Storage.
- Script de copia: por cada foto, descarga los tamaños elegidos y los sube al bucket; guarda la ruta. Reutilizar el patrón de subida de `src/lib/supabase/storage.ts`.
- El sitio (`PropertyCard`, `Gallery`, ficha) usa nuestra copia cuando existe y el link de Adinco si no. Sin el optimizador de Vercel (su cupo ya se agotó una vez; ver comentario en `adinco-images.ts`).
- El sync sigue funcionando mientras exista Adinco y copia las fotos nuevas.

### Fase 2 — Propiedades propias (requiere cambio de base)
- Pendiente BD: campo de origen en `Listing` (`ADINCO` / `PROPIA`) y código propio de propiedad. Importante: hoy el sync **desactiva todo lo que no está en el XML** (`sync.ts`, `updateMany ... notIn`); tiene que pasar a desactivar solo lo de origen `ADINCO`.
- Backoffice: sección "Propiedades" para crear y editar, con todos los campos que hoy trae el XML, carga de fotos (generando los tamaños al subir), orden y foto destacada, y publicar o despublicar. Reutiliza `ActionForm` / `conAviso` y el patrón de PDFs de `DocumentosContratoFields`.
- Conversión: un botón o script que pasa todas las propiedades importadas a origen `PROPIA` el día del corte.

### Fase 3 — Portales (decisión antes de dar de baja Adinco)
Opciones a evaluar, con costos de cada portal:
- Integración directa con cada portal: MercadoLibre tiene API pública; Zonaprop y Argenprop trabajan con integradores o feeds XML en su formato, que habría que consultar con cada uno.
- Un integrador o CRM más barato solo para difundir.
- Carga manual en cada portal (viable solo si son pocas propiedades).

### Fase 4 — Corte
1. Ventana "todo Vigente" con el respaldo de la Fase 0 y la importación completa.
2. Volver los estados reales en Adinco; nuestro sistema marca vendidas y no vigentes.
3. Último sync, conversión a `PROPIA`, apagar el cron de `vercel.json` y el sync.
4. Verificar el sitio y los portales; recién ahí dar de baja Adinco.

## Verificación
- Fase 0: el script deja un XML con la misma cantidad de `<ad>` que el feed, y la cantidad de fotos descargadas coincide con la de `<picture>`. Prueba de `parseFeed` sobre el respaldo.
- Fase 1: en la preview, todas las fichas muestran fotos desde nuestro bucket; un listado de fotos sin copia da 0.
- Fase 2: crear, editar y despublicar una propiedad de prueba en la preview; correr el sync y comprobar que no la desactiva.
- Fase 4: comparar la cantidad de propiedades activas antes y después del corte.

## Archivos clave
- `src/lib/feed.ts` (parser, campos del XML), `src/lib/sync.ts` (sync y desactivación), `src/lib/adinco-images.ts` (tamaños de fotos), `src/lib/supabase/storage.ts` (subidas), `src/app/api/sync/route.ts`, `vercel.json` (cron), `prisma/schema.prisma` (`Listing`, `ListingImage`, `ListingVideo`, `Agency`; solo lectura desde esta sesión).

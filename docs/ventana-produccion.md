# Ventana de migración a producción (fichas, planilla y Historial)

Objetivo: que producción tenga todas las propiedades con su ficha (las vigentes y las que Adinco ya no publica), el Historial vinculado y los módulos nuevos (Propiedades, Visitas y llaves), **mientras Adinco sigue activo**. No es el corte con Adinco: Adinco sigue publicando en los portales y el sync diario sigue funcionando igual.

## Qué cambia y qué no

- **Cambia:** aparecen en el backoffice las secciones Propiedades y Visitas y llaves, las 367 fichas, los propietarios cargados y el Historial vinculado con las fichas.
- **No cambia:** el sitio público muestra las mismas propiedades (las vigentes de Adinco). Nada se publica ni se despublica por esta ventana.
- **Fotos de las vigentes:** se copian a nuestro Storage (hasta 8 por propiedad, recortadas y en WebP, unos 125 MB) y el sitio pasa a servirlas desde Supabase. Desde ahí cada visita usa transferencia de Supabase: el plan gratis (5 GB/mes) alcanza para unas 5.800 visitas por mes. Como el sitio no tiene Web Analytics activado, no hay datos de tráfico: revisar el consumo en Supabase → Usage los primeros días y pasar a Pro si se acerca al límite.

Fechas acordadas: hoy (26/11) esta ventana; el sábado, la ventana "todo Vigente" en Adinco para traer descripción, fotos y amenities de todas y hacer el corte del XML (ver "El sábado" al final).

## Antes del día

1. Elegir un horario de poco uso del backoffice. Duración estimada: 30 a 45 minutos.
2. Revisar en local las 15 propiedades del Historial que no coinciden del todo (`/backoffice/historial/vincular`), para decidir de antemano qué hacer con las de dirección distinta (4, 10, 154 y 383).
3. Tener a mano la última exportación de la planilla de Adinco: los estados cambian todos los días, así que se vuelve a bajar el mismo día de la ventana (ver paso 5).

## Paso a paso (desde la PC principal, en la carpeta del proyecto)

Todos los comandos usan `.env` (producción). Ninguno usa `.env.localdb`.

### 1. Respaldo completo de la base
```
npm run respaldo:base
```
Deja `respaldos/base/<host>-<fecha>.dump`. **No seguir si este paso falla.**

### 2. Aplicar las 5 migraciones
```
npx prisma migrate status     # tiene que listar las 5 pendientes
npx prisma migrate deploy
npx prisma migrate status     # "Database schema is up to date"
```
Las 5 migraciones (`20261125180000` a `20261126100000`) solo agregan columnas, tablas y permisos. El sistema publicado hoy sigue funcionando con ellas, así que no hay apuro entre este paso y el siguiente.

### 3. Publicar el código
- Subir la rama: `git push -u origin migracion-adinco`.
- Abrir el pull request de `migracion-adinco` hacia `main` y mergearlo. Vercel despliega solo.
- Esperar a que el despliegue termine bien en Vercel y entrar al backoffice: tienen que aparecer Propiedades y Visitas y llaves en el menú.

### 4. Sync forzado
```
npm run sync -- --force
```
Completa en las fichas vigentes los campos nuevos (amenities, entre calles, antigüedad, etc.). Tiene que terminar sin errores de lectura.

### 4b. Copiar las fotos de las vigentes
```
npm run copiar-fotos
npm run copiar-fotos -- --confirmar=<host que mostró>
```
Crea el bucket público "propiedades" si no existe y copia hasta 8 fotos por propiedad (unas 1.100). Tarda unos 5 minutos. Si se corta, se vuelve a correr: saltea las ya copiadas. Al terminar, "propiedades con fotos pero sin ninguna copia" tiene que dar 0. Comprobar en el sitio que una ficha muestra las fotos (la dirección de la imagen empieza con la de Supabase).

### 5. Importar la planilla de Adinco
1. Bajar la planilla actualizada del día y guardarla como `respaldos/planilla/UNIFICADO-<fecha>.json` (se puede pedir a Claude que la baje con el conector de Google Sheets).
2. Correr el importador. La primera vez se frena y muestra el host de producción; se vuelve a correr agregando la confirmación que indica:
```
npm run importar-planilla -- respaldos/planilla/UNIFICADO-<fecha>.json
npm run importar-planilla -- respaldos/planilla/UNIFICADO-<fecha>.json --confirmar=<host que mostró>
```
Resultado esperado: unas 212 fichas creadas sin publicar, unas 155 actualizadas y 17 propietarios vinculados (los números pueden variar si cambiaron estados).

Importante: correrlo **una sola vez** por ventana y con la planilla del día. Volver a correrlo más adelante con una planilla vieja devolvería a estados viejos las fichas que el sync haya actualizado.

### 6. Vincular el Historial
En el backoffice de producción: Historial → **Vincular con las fichas**.
1. Botón "Vincular las N con dirección igual o parecida". La dirección pasa a ser la de la ficha y la anterior queda en las notas de cada propiedad del Historial.
2. Las de dirección distinta, una por una, según lo decidido en "Antes del día".

### 7. Verificar
```
npm run verificar:migracion
```
Esperado (aproximado):
- Fichas: unas 367, por estado parecido a la planilla, todas de origen ADINCO.
- Publicadas en el sitio: las mismas que antes de la ventana (alrededor de 155).
- Historial: 48 propiedades, vinculadas las que se resolvieron, 0 con código "GARC1-".

Y a mano:
- El sitio público se ve igual: listado, una ficha y sus fotos.
- Un contrato del Historial abre bien y muestra su propiedad.
- Una ficha alquilada (por ejemplo la 359) muestra sus operaciones del Historial.

## Si algo sale mal

- **Falla el despliegue del paso 3:** las migraciones ya aplicadas no molestan al sistema anterior. Se corrige y se vuelve a desplegar, o se revierte el merge en GitHub.
- **El importador o la vinculación dejaron algo mal:** se puede repetir la vinculación (desvincular y vincular) desde la pantalla. Las fichas creadas por la planilla se identifican porque tienen `planillaAdinco` en `rawData`.
- **Último recurso, volver toda la base al respaldo del paso 1** (se pierde todo lo cargado después del respaldo):
```
"C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" --clean --if-exists --no-owner --no-privileges --schema=public --dbname="<DIRECT_URL de .env>" respaldos/base/<archivo>.dump
```

## Después de la ventana (hasta el sábado)

- Adinco sigue siendo quien publica. Las altas nuevas se siguen haciendo en Adinco hasta el corte, para que no se crucen los códigos.
- En el backoffice ya se pueden cargar llaves, visitas, propietarios, captadores y estados internos de todas las propiedades.
- Si Adinco publica una propiedad nueva antes del sábado, el sitio la muestra con las fotos de Adinco hasta que se vuelva a correr `copiar-fotos`.

## El sábado: "todo Vigente" y corte del XML (a preparar antes)

1. Apagar el sync automático antes de poner todo vigente en Adinco: con todo vigente, el sync de las 18:00 volvería a publicar en el sitio las alquiladas y vendidas.
2. **Exportar la planilla de estados ANTES de tocar nada en Adinco**: es el único registro de los estados reales.
3. Poner todo vigente en Adinco y bajar el XML con `npm run respaldo -- --fotos`.
4. Importar ese XML (sync con el archivo): entran descripción, fotos y amenities de todas. Por un momento quedan como disponibles y publicadas.
5. **Inmediatamente después**, importar la planilla del paso 2: devuelve cada ficha a su estado real y despublica las alquiladas, vendidas y suspendidas. Correr 4 y 5 seguidos deja la exposición en segundos. Las fichas cuyo estado alguien cambió en el backoffice no se tocan en ninguno de los dos pasos.
6. Copiar las fotos de todas (`copiar-fotos`) y volver los estados reales en Adinco.
7. Corte: pasar todas las fichas a origen propio, quitar el cron de `vercel.json` y el sync. Desde ahí, las altas y ediciones se hacen en nuestro sistema.
8. Pendiente aparte: la difusión a portales (Zonaprop, Argenprop, MercadoLibre) sigue dependiendo de Adinco hasta resolver L4.

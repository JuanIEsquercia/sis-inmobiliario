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

#### Numeración de códigos de propiedad

Las propiedades propias siguen la numeración correlativa que ya usa la inmobiliaria: hoy va cerca del código 380, y las nuevas toman 381, 382 y así sucesivamente, sin saltos ni reinicios.

- El sistema asigna el código al crear la propiedad: el último número usado + 1. El agente no lo tipea.
- Punto de partida: el número más alto entre los códigos de las propiedades importadas (`Listing.code`) y de las unidades (`Unit.propertyCode`), ignorando los códigos de relleno ("0", "1") y los que no son números.
- Dos altas al mismo tiempo no pueden recibir el mismo número. Pendiente BD: un contador en la base inicializado en ese máximo, y código único entre las propiedades propias.
- Mientras Adinco siga activo, Adinco también asigna códigos y podría repetir uno nuestro. Por eso el sistema numera recién desde el corte (Fase 4); hasta entonces las altas se siguen haciendo en Adinco.
- Un código no se reutiliza aunque la propiedad se venda o se elimine.

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

## Llaves y visitas (después de la Fase 2)

Cada propiedad indica dónde está su llave, y el vendedor la pide desde el sistema para una visita con fecha y turno de 30 minutos. Al terminar marca la visita como hecha y, si la llave era de la inmobiliaria, la devuelve.

### Dónde está la llave (en la ficha de la propiedad)

- **En la inmobiliaria ("Retirar de inmo"):** con el número de llavero o su lugar en el tablero.
- **Con un contacto:** el propietario o un encargado, con nombre, teléfono y relación con la propiedad. Si el contacto ya está en Clientes, se reutiliza.
- **Notas:** cantidad de juegos e indicaciones de acceso (portero, alarma).
- Una propiedad sin llave indicada no se puede pedir, y el sistema lo avisa.

### Pedido de llave para visita

Cada visita dura siempre 30 minutos. El vendedor elige la fecha y un turno de la lista fija: de 07:00 a 21:30, cada media hora (07:00, 07:30 … 21:30), así la última visita termina a las 22:00. Todos los días, sábados y domingos incluidos: cada vendedor coordina libremente sus visitas. El fin se calcula solo; no se eligen inicio y fin libres. Cada visita queda asociada al interesado (cliente o pedido de búsqueda), y así se registra qué leads avanzaron hasta la visita.

Si la llave está en la inmobiliaria:

1. **Pedida:** aparece en la lista de llaves del día de quien las entrega.
2. **Retirada:** queda registrado quién la tiene y desde cuándo.
3. **Visita hecha:** la marca el vendedor.
4. **Llave devuelta:** la marca el vendedor y la confirma quien la recibe en la inmobiliaria.

Si la llave la tiene un contacto:

1. **Pedida:** el sistema arma el WhatsApp al contacto con la propiedad, la fecha y el horario (reutiliza `src/lib/whatsapp.ts`).
2. **Coordinada:** el vendedor marca que el contacto confirmó.
3. **Visita hecha:** la marca el vendedor. No hay devolución de llave.

En cualquier paso el pedido se puede cancelar.

### Tarjeta de visita

Cada pedido de llave abre una tarjeta de visita: la ficha donde queda toda la trazabilidad de esa visita, desde el pedido hasta el cierre.

- **Cabecera:** la propiedad con su código y el vendedor se completan solos (la propiedad desde la que se pidió la llave y el usuario que la pidió); el vendedor elige el interesado, la fecha y el turno, y se muestra dónde está la llave.
- **Línea de tiempo:** cada paso con fecha, hora y quién lo hizo (pedida, retirada o coordinada, visita hecha, llave devuelta, cancelada).
- **Carga del vendedor:** el resultado se elige de una lista precargada de categorías para perfilar el lead (por ejemplo: le interesó, pide segunda visita, hace oferta, no le gustó la zona, fuera de presupuesto, descartado), sin texto libre. La lista la administra quien gestiona el sistema, como los conceptos de Presupuestos.
- **Listado de tarjetas:** las del día y las abiertas, filtrables por vendedor, propiedad y estado. Desde la ficha del interesado y la de la propiedad se ven sus tarjetas.

### Controles

- Dos visitas a la misma propiedad en el mismo turno: el sistema no lo permite.
- Una llave de la inmobiliaria que no volvió el día de la visita aparece en la campanita de alertas, con quién la tiene.
- Permisos nuevos en `src/lib/permissions.ts`: pedir llaves (vendedores) y gestionar llaves (quien las entrega en la inmobiliaria).
- Historial por propiedad y por interesado: quién visitó, cuándo y cuándo volvió la llave. Desde cada interesado se ve si su lead llegó a visita.

### Qué requiere en la base (pendiente BD)

- Llave por propiedad: ubicación (inmobiliaria o contacto), contacto y notas.
- Pedidos de visita (la tarjeta): propiedad, vendedor, fecha, turno (hora de inicio; dura 30 minutos), estado, fechas de retiro y devolución, interesado (obligatorio), categoría de resultado.
- Lista de categorías de resultado administrable.
- Línea de tiempo de cada tarjeta: paso, fecha y hora, quién lo hizo.
- Se aplica desde Antigravity, como el resto de los cambios de esquema.

### Cuándo

Después de la Fase 2, porque la llave se carga en la ficha propia de la propiedad. Podría arrancar antes sobre las propiedades importadas, pero habría que cargar los datos de llaves dos veces.

## Verificación
- Fase 0: el script deja un XML con la misma cantidad de `<ad>` que el feed, y la cantidad de fotos descargadas coincide con la de `<picture>`. Prueba de `parseFeed` sobre el respaldo.
- Fase 1: en la preview, todas las fichas muestran fotos desde nuestro bucket; un listado de fotos sin copia da 0.
- Fase 2: crear, editar y despublicar una propiedad de prueba en la preview; correr el sync y comprobar que no la desactiva.
- Fase 4: comparar la cantidad de propiedades activas antes y después del corte.

## Avance y decisiones (2026-11-25, PC principal, rama `migracion-adinco`)

Se trabaja primero en un **entorno local** (Supabase en Docker, ver `docs/entorno-local.md`) para confirmar que todo es viable antes de pasar al plan pago de Supabase. Nada de esta rama llega a `main` ni a producción hasta probarlo y aprobarlo.

### Estado de la base real (conteo de solo lectura)
- 186 propiedades guardadas: 154 activas y 32 inactivas (las que salieron del feed desde el 24/08/2026). Las ~200 que faltan para llegar a 388 salieron antes de esa fecha y nunca entraron: se recuperan con la ventana "todo Vigente".
- Código: se usa `<code>` del XML (no `<id>`, que es interno de Adinco). El feed ya trae al menos hasta el código 388 y el Historial hasta el 392.
- Historial (`Unit`): 48 propiedades, ninguna vinculada a una ficha. Solo 9 coinciden hoy porque las demás no están en nuestra base (no por el formato del código).

### Decisiones
- **Ficha única sobre `Listing`.** Se le agregan origen, estado comercial, captador y llave. Las `Unit` (contratos, ventas, tasaciones) se vinculan a la ficha en una etapa de normalización, una vez importado todo.
- **Normalización de códigos:** se toma solo el número final, sin ceros a la izquierda ("GARC1-359" → "359").
- **Estados reales:** se exportan desde el panel de Adinco (Excel/CSV con código y estado) **antes** de poner todo en "Vigente", y se cruzan por código.
- **Origen** (`ADINCO` / `PROPIA`) es técnico: el sync solo actualiza y da de baja fichas de origen Adinco.
- **Captador** (L2): en la ficha, un agente o vacío = la inmobiliaria, con la misma regla que ya usan `Sale`/`RentalCommission` y `calcularReparto`. Al cargar una venta o contrato desde la ficha viene precargado y editable. El "vendedor" que trae Adinco por aviso puede ofrecerse como sugerencia inicial.
- **Numeración propia:** después del código más alto entre Adinco y el Historial (hoy ≥ 392).

### Fotos (medido)
- Adinco entrega todo en 1920×1080 y casi todas son placas verticales 4:5 con bandas blancas a los costados.
- Se guardan en Supabase **las primeras 8 fotos** de cada propiedad (destacada primero), **con bordes blancos recortados** (79 de 80 en la muestra) y en **WebP** en 3 tamaños de lado mayor: 1600 (principal y pantalla completa), 640 (tarjetas y mosaico) y 320 (miniaturas). Resultado real: **115 KB por foto** con sus 3 versiones.
- El **respaldo completo** (todas las fotos originales, sin tope) va a `respaldos/` en la PC: hoy 1.611 fotos, 190 MB.
- Almacenamiento estimado para 388 propiedades × 8 fotos: **~350 MB**.
- **Visita típica** (inicio + listado + 2 fichas + 4 fotos en pantalla completa), medida en el sitio local: **904 KB** de fotos con nuestra copia contra 1.206 KB con las mismas fotos desde Adinco, y con más resolución útil (sin bandas blancas). Las fotos se cachean un año en el navegador: quien vuelve no las descarga de nuevo.
- Transferencia: el plan gratis (5 GB/mes) da ~5.800 visitas por mes; el Pro (250 GB/mes) ~290.000. Confirmar los valores vigentes en la página de precios de Supabase.

### L1 hecho en local
- Migración `20261125180000_listing_origin_image_storage`: `Listing.origin` y `ListingImage.storagePath`.
- `npm run respaldo -- --fotos`: XML con fecha + fotos originales (no toca ninguna base).
- `npm run local:importar -- <xml>`: importa un respaldo con el mismo `runSync` de producción.
- `npm run local:copiar-fotos`: copia, recorta y convierte las fotos al Storage local; informa peso y tiempo.
- El sync conserva la copia de cada foto al actualizar un aviso y nunca toca ni da de baja fichas propias (probado).
- El sitio muestra la copia propia cuando existe (`src/lib/property-images.ts`) y si no, la de Adinco.
- Prueba completa: 155 propiedades, 1.100 fotos copiadas en 4,5 minutos, 0 errores, 124 MB.

### L2 hecho en local: sección Propiedades
- Migración `20261125190000_listing_ficha_estado_captador`: estado comercial (`DISPONIBLE`, `RESERVADA`, `VENDIDA`, `ALQUILADA`, `SUSPENDIDA`), captador, notas internas, quién creó la ficha, contador de códigos (`listing_code_seq`) y permisos nuevos (los administradores reciben los tres; el resto, `propiedades.ver`).
- Permisos: `propiedades.ver`, `propiedades.editar` (alta, edición, fotos, estado, captador) y `propiedades.publicar`.
- `/backoffice/propiedades`: listado con búsqueda por código (también "GARC1-123"), dirección o título, y filtros por estado, operación, publicación y origen.
- Ficha: en las de Adinco se editan solo los datos internos y se ve lo publicado; en las propias se edita todo, con fotos (hasta 8, se achican en el navegador, se recortan y se pasan a WebP al subir; ordenar, principal, eliminar) y publicar o despublicar.
- Vendida, alquilada o suspendida despublica al guardar, y el sync no la vuelve a publicar aunque Adinco la siga mandando. Reservada sigue publicada con etiqueta "Reservada" en el sitio.
- Captador: un agente o "Inmobiliaria". Si el vendedor que Adinco tiene asignado coincide por email con un usuario, se sugiere.
- Alta propia: código automático = máximo entre fichas e Historial (normalizado) + 1, con bloqueo para que dos altas simultáneas no repitan número. Nace sin publicar.
- "Pasar a ficha propia" (para el corte): exige al menos una foto copiada y quita las fotos que siguen apuntando a Adinco.
- La ficha muestra las operaciones del Historial con el mismo código normalizado (vista previa de la normalización).
- Prueba de punta a punta en el navegador (14 comprobaciones, todas bien): estado y captador en una ficha de Adinco, etiqueta Reservada en el sitio, vendida se despublica y el sync la respeta, alta propia con código correlativo, subir, ordenar y eliminar fotos, editar, publicar, y el sync no la toca.

### Ficha con los campos del formulario de Adinco
- Migración `20261125200000_listing_campos_adinco`: los campos del formulario de carga de Adinco que no se guardaban aparte (edificación, no publicar precio, expensas aproximadas, apto profesional, mascotas, ocupada, datos de alquiler, barrio cerrado, dirección aproximada, entre calles, cerca de, superficies descubierta y fondo libre, antigüedad, plantas, agua caliente, disposición, calefacción, edificio, cocheras, tour virtual) y las listas de instalaciones, servicios del edificio y amenities.
- Mismas secciones, opciones y listas que Adinco (`src/lib/property-features.ts`). Descartados, por ser de los portales o no usarse: garantías de Argenprop, compartir comisión, luminosidad, tipo de piso, vista, balcón, vigilancia y costa, y los textos automáticos.
- El parser del XML lee los campos nuevos y reparte servicios, instalaciones y amenities en sus listas. Lo que no corresponde a ninguna opción queda como "Otros datos de Adinco" (19 de las 155 propiedades tienen alguno).
- Sitio: "No publicar precio" muestra "Consultar precio" (también al compartir y en los datos para buscadores); "dirección aproximada" muestra la calle sin número y el mapa no usa las coordenadas exactas. La ficha pública muestra los grupos de características y el tour virtual.
- **Al pasar a producción:** después de aplicar la migración, correr una vez `npm run sync -- --force` para completar estos campos en las fichas que ya están cargadas.

### L3 hecho en local: llaves y visitas
- Migración `20261125210000_llaves_y_visitas`: llave en la ficha (ubicación, llavero, contacto, juegos, indicaciones), `Visit` (la tarjeta), `VisitEvent` (línea de tiempo) y `VisitOutcome` (categorías de resultado, con 7 iniciales). En la base: un solo turno activo por propiedad (índice único parcial), turno de la lista fija, nunca cliente y pedido a la vez, y RLS como el resto.
- Permisos: `visitas.pedir` (vendedores: piden y ven sus visitas), `visitas.gestionar_llaves` (entrega y recepción en la inmobiliaria, ve todas) y `visitas.categorias`.
- Reglas en `src/lib/visit-rules.ts` (puras, con pruebas en `npm test`): turnos 07:00 a 21:30, hora de Argentina y circuito de estados.
  - Llave en la inmobiliaria: pedida → retirada (la entrega quien gestiona llaves) → visita hecha (con resultado) → devuelta → devolución confirmada.
  - Llave con un contacto: pedida (botón de WhatsApp con propiedad, fecha y turno) → coordinada → visita hecha.
  - Cancelar en cualquier paso abierto; si la llave estaba retirada, queda como devuelta pendiente de confirmar.
- Pantallas: Tarjetas de visita (hoy, abiertas, todas, con filtros), pedido de llave desde la ficha (turnos ocupados deshabilitados), tarjeta con línea de tiempo, Llaves del día (atrasadas, para entregar, afuera, por confirmar) y Categorías de resultado.
- La ficha de la propiedad, la del cliente y la del pedido muestran sus visitas con el resultado (perfil del lead).
- Campanita: "Llaves sin devolver" (quien gestiona llaves, todas; cada vendedor, las suyas).
- Prueba de punta a punta con dos usuarios (vendedor y gestor): carga de llaves, pedido, turno ocupado, entrega, visita hecha, alerta de llave atrasada, devolución y confirmación, circuito con contacto e interesado por pedido, historial en cliente y pedido, y que un vendedor no puede abrir la tarjeta de otro.

### Planilla de Adinco y vinculación del Historial (2026-11-26)
- Planilla "UNIFICADO" del panel de Adinco (367 avisos): respaldo en `respaldos/planilla/UNIFICADO-2026-11-26.json`. Trae estado, id del aviso, datos básicos, responsable y propietario.
- Estados: Vigente → disponible; Alquilado (también "Incompleta") → alquilada; Vendido → vendida; Suspendido, "Vigente Incompleta" y Borrador → suspendida; Reservado → reservada.
- "Usuario asignado" es el responsable, no el captador: se guarda como "Responsable en Adinco". Se sacó la sugerencia de captador de L2.
- Migración `20261126100000_listing_propietario`: propietario de la ficha, vinculado a Clientes (en datos internos y en el alta).
- `npm run local:importar-planilla -- <json>` (lector puro en `src/lib/planilla-adinco.ts`, con pruebas): cruza por id de aviso. Resultado local: 212 fichas nuevas sin publicar (28 con venta/alquiler deducido por la moneda, marcadas en notas internas), 155 existentes actualizadas, 17 propietarios vinculados (10 clientes). Repetirla no duplica nada.
- Regla del sync: si una ficha viene en el XML pero acá está vendida, alquilada o suspendida, manda Adinco cuando el estado vino de Adinco (se republica como disponible) y manda el nuestro cuando alguien lo cambió en el backoffice. Probado.
- Vinculación Historial ↔ fichas (`/backoffice/historial/vincular`, permiso `historial.editar`): por código normalizado, con comparación de direcciones (`src/lib/vinculacion.ts`). Botón para vincular de una vez las de misma dirección; las demás, una por una. Al vincular, el código del Historial queda normalizado ("GARC1-359" → "359"). En local: 48 de 48 tienen ficha, 33 con misma dirección; 15 para revisar a mano (entre ellas 4, 10, 154 y 383, que pueden ser un código mal cargado).
- Pendiente: la ventana "todo Vigente" con todas las propiedades, más adelante, para traer descripción, fotos y amenities de las 212.

### Pendiente antes de producción
- La imagen para compartir en redes (`opengraph-image.tsx`) sigue usando la foto de Adinco: hay que darle una versión JPEG propia antes del corte.
- El sync de producción tiene que copiar las fotos nuevas solo (hoy la copia es un script aparte).
- Borrar del Storage las fotos que Adinco quite de un aviso.

## Archivos clave
- `src/lib/feed.ts` (parser, campos del XML), `src/lib/sync.ts` (sync y desactivación), `src/lib/adinco-images.ts` (tamaños de fotos), `src/lib/supabase/storage.ts` (subidas), `src/app/api/sync/route.ts`, `vercel.json` (cron), `prisma/schema.prisma` (`Listing`, `ListingImage`, `ListingVideo`, `Agency`; solo lectura desde esta sesión).

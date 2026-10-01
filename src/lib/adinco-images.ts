// Adinco publica cada foto en cinco tamaños, cambiando el prefijo del
// nombre del archivo. Medido contra el CDN real:
//
//   extra_large_   1920 x 1080   84 KB
//   large_         1024 x  768   45 KB
//   medium_         640 x  470   20 KB
//   small_          290 x  194    6 KB
//   thumb_           75 x   50    1 KB
//
// El feed siempre manda la variante extra_large (verificado: las 1664
// fotos cargadas son de static1.adinco.net y todas con ese prefijo), así
// que el sistema venía usando la foto de 1920 px en TODOS lados — hasta
// en las miniaturas de 80 px de la galería. Para disimularlo, cada
// <Image> pasaba por el optimizador de Vercel, que redimensionaba al
// vuelo.
//
// Eso se agotó: el plan tiene un cupo mensual de transformaciones y con
// 1664 fotos, cada una pedida en varios anchos, se consumió entero. A
// partir de ahí el optimizador devuelve 402 y NINGUNA imagen carga.
//
// Usando estas variantes no hace falta optimizador: Adinco ya hizo el
// trabajo y lo sirve de su propio CDN, gratis. Se elige el tamaño que
// corresponde a cada lugar y las fotos quedan incluso más livianas que
// antes en las miniaturas.
//
// Las variantes son la MISMA foto encajada en cajas de distinto tamaño
// (con relleno blanco a los costados, porque las fotos de Adinco son
// placas verticales sobre lienzo blanco), no recortes distintos. Por eso
// se pueden intercambiar sin que cambie lo que se ve.
export type AdincoVariant = "extra_large" | "large" | "medium" | "small" | "thumb";

// Solo este host: es el único del que se verificó que sirve las cinco
// variantes. Cualquier otra URL se devuelve intacta en vez de arriesgar
// un 404 por inventarle un prefijo que no existe.
const ADINCO_HOST = "static1.adinco.net";
const PREFIJOS = /^(extra_large|large|medium|small|thumb)_/;

export function adincoImage(url: string, variant: AdincoVariant): string {
  try {
    const u = new URL(url);
    if (u.hostname !== ADINCO_HOST) return url;

    const partes = u.pathname.split("/");
    const archivo = partes[partes.length - 1];
    if (!archivo || !PREFIJOS.test(archivo)) return url;

    partes[partes.length - 1] = archivo.replace(PREFIJOS, `${variant}_`);
    u.pathname = partes.join("/");
    return u.toString();
  } catch {
    // URL inválida: se devuelve como vino. No es tarea de esta función
    // decidir qué hacer con una foto mal cargada.
    return url;
  }
}

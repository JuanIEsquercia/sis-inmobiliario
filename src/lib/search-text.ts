// Deja un texto listo para comparar en una búsqueda: sin tildes, sin
// diéresis, sin eñes, todo en minúscula y con los espacios parejos.
//
// Existe porque nadie escribe las tildes en un buscador. Buscar "espana"
// no encontraba "España 1000", y buscar "junin" no encontraba
// "Junín 2300" — y eso en Corrientes deja afuera varias calles.
//
// La alternativa era instalar la extensión `unaccent` de Postgres y
// escribir la consulta a mano en SQL. Se descartó: obliga a sacar la
// búsqueda del constructor de filtros de Prisma (que arma el where, el
// conteo y la paginación), por un problema que se resuelve guardando el
// texto ya normalizado en una columna. Además esto queda igual en la
// base y en el navegador, sin depender de qué extensiones tenga
// instaladas el servidor.
//
// Cómo funciona: NFD separa cada letra acentuada en letra + marca (á
// pasa a ser "a" + tilde), y después se borran todas las marcas. La ñ
// entra en lo mismo: queda "n". Por eso "España" y "espana" terminan
// siendo el mismo texto, que es justo lo que se busca.
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

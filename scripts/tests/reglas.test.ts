// Pruebas de las funciones puras (sin base de datos): turnos y estados
// de visitas, códigos de propiedad y reparto de características de Adinco.
// Uso: npm test
import assert from "node:assert/strict";
import * as R from "../../src/lib/visit-rules";
import { normalizarCodigo, codigoMaximo } from "../../src/lib/property-codes";
import { clasificarCaracteristicas } from "../../src/lib/property-features";
import * as P from "../../src/lib/planilla-adinco";
import { compararDirecciones } from "../../src/lib/vinculacion";
import { publicAddress } from "../../src/lib/format";

let n = 0;
const t = (nombre: string, fn: () => void) => { fn(); n++; console.log("OK ", nombre); };

t("30 turnos de 07:00 a 21:30", () => {
  assert.equal(R.TURNOS.length, 30);
  assert.equal(R.TURNOS[0], "07:00");
  assert.equal(R.TURNOS.at(-1), "21:30");
});
t("fin de turno", () => { assert.equal(R.finDeTurno("21:30"), "22:00"); assert.equal(R.finDeTurno("09:30"), "10:00"); });
t("turno inválido", () => { assert.ok(!R.esTurnoValido("06:30")); assert.ok(!R.esTurnoValido("22:00")); assert.ok(!R.esTurnoValido("10:15")); });
t("inicio de turno en hora argentina", () => assert.equal(R.inicioDelTurno("2026-11-25", "21:30").toISOString(), "2026-11-26T00:30:00.000Z"));
t("día argentino a la noche (UTC ya es mañana)", () => assert.equal(R.diaArgentina(new Date("2026-11-26T01:00:00Z")), "2026-11-25"));
t("día válido", () => { assert.ok(R.esDiaValido("2026-02-28")); assert.ok(!R.esDiaValido("2026-02-30")); assert.ok(!R.esDiaValido("hoy")); });

const v = (status: R.EstadoVisita, keyLocation: R.UbicacionLlave, devuelta = false, confirmada = false) => ({
  status, keyLocation, devueltaAt: devuelta ? new Date() : null, returnConfirmedAt: confirmada ? new Date() : null,
});
t("inmobiliaria: pedida -> retirar o cancelar", () => assert.deepEqual(R.accionesPosibles(v("PEDIDA", "INMOBILIARIA")), ["retirar", "cancelar"]));
t("contacto: pedida -> coordinar o cancelar", () => assert.deepEqual(R.accionesPosibles(v("PEDIDA", "CONTACTO")), ["coordinar", "cancelar"]));
t("contacto: no se puede marcar hecha sin coordinar", () => assert.ok(!R.puede(v("PEDIDA", "CONTACTO"), "realizar")));
t("retirada -> realizar o cancelar", () => assert.deepEqual(R.accionesPosibles(v("RETIRADA", "INMOBILIARIA")), ["realizar", "cancelar"]));
t("realizada inmobiliaria -> devolver", () => assert.deepEqual(R.accionesPosibles(v("REALIZADA", "INMOBILIARIA")), ["devolver"]));
t("realizada contacto -> nada (no hay devolución)", () => assert.deepEqual(R.accionesPosibles(v("REALIZADA", "CONTACTO")), []));
t("devuelta sin confirmar -> confirmar", () => assert.deepEqual(R.accionesPosibles(v("DEVUELTA", "INMOBILIARIA", true)), ["confirmarDevolucion"]));
t("devuelta y confirmada -> nada", () => assert.deepEqual(R.accionesPosibles(v("DEVUELTA", "INMOBILIARIA", true, true)), []));
t("cancelada con llave devuelta -> confirmar", () => assert.deepEqual(R.accionesPosibles(v("CANCELADA", "INMOBILIARIA", true)), ["confirmarDevolucion"]));
t("llave afuera", () => {
  assert.ok(R.llaveAfuera({ ...v("REALIZADA", "INMOBILIARIA"), retiradaAt: new Date() }));
  assert.ok(!R.llaveAfuera({ ...v("DEVUELTA", "INMOBILIARIA", true), retiradaAt: new Date() }));
  assert.ok(!R.llaveAfuera({ ...v("PEDIDA", "INMOBILIARIA"), retiradaAt: null }));
});

t("normalizar código", () => {
  assert.equal(normalizarCodigo("GARC1-359"), "359");
  assert.equal(normalizarCodigo("garc1-0359"), "359");
  assert.equal(normalizarCodigo(" 42 "), "42");
  assert.equal(normalizarCodigo("sin código"), null);
});
t("código máximo ignora relleno y basura", () => assert.equal(codigoMaximo(["0", "1", "GARC1-392", "388", null, "abc"]), 392));
t("clasificar características de Adinco", () => {
  const r = clasificarCaracteristicas(["Electricidad", "Servicio de limpieza"], ["Pileta", "Balcón Terraza", "Jardín trasero", "Vidriera", "Lavadero"]);
  assert.deepEqual(r.services, ["Electricidad", "Limpieza"]);
  assert.deepEqual(r.installations, ["Balcón terraza", "Lavadero"]);
  assert.deepEqual(r.buildingAmenities, ["Pileta", "Jardín"]);
  assert.deepEqual(r.otherData, ["Vidriera"]);
});
t("planilla: precios", () => {
  assert.deepEqual(P.precioDesdeAdinco("$ 1.300.000"), { amount: 1300000, currency: "ARS" });
  assert.deepEqual(P.precioDesdeAdinco("U$D 75.000"), { amount: 75000, currency: "USD" });
  assert.equal(P.precioDesdeAdinco("Consultar precio"), null);
  assert.equal(P.precioDesdeAdinco("$ 1"), null);
});
t("planilla: superficies, enteros y ubicación", () => {
  assert.equal(P.superficie("35 m2"), 35);
  assert.equal(P.superficie("2 ha"), 20000);
  assert.equal(P.superficie("-"), null);
  assert.equal(P.entero("+ 5"), 5);
  assert.equal(P.entero("Monoamb."), 0);
  assert.equal(P.entero("5 años"), 5);
  assert.deepEqual(P.ubicacion("Centro, Corrientes, Corrientes"), { neighborhood: "Centro", city: "Corrientes", region: "Corrientes" });
  assert.deepEqual(P.ubicacion("San Luis del Palmar, Corrientes"), { neighborhood: null, city: "San Luis del Palmar", region: "Corrientes" });
});
t("planilla: estados", () => {
  assert.equal(P.estadoDesdeAdinco("Vigente"), "DISPONIBLE");
  assert.equal(P.estadoDesdeAdinco("Alquilado Incompleta"), "ALQUILADA");
  assert.equal(P.estadoDesdeAdinco("Vigente Incompleta"), "SUSPENDIDA");
  assert.equal(P.estadoDesdeAdinco("Borrador"), "SUSPENDIDA");
  assert.equal(P.estadoDesdeAdinco("Otro"), null);
});
t("planilla: propietario descarta emails de la inmobiliaria y de relleno", () => {
  assert.deepEqual(P.propietario("Jorge  Lucki", "garciajpropiedades@gmail.com", "3794929092"), { firstName: "Jorge", lastName: "Lucki", email: null, phone: "3794929092" });
  assert.equal(P.propietario("Sergio Ricer", "nomail@gmail.com", "-")?.email, null);
  assert.equal(P.propietario("Laura Vischi", "DraVischi@yahoo.com.ar", "-")?.email, "dravischi@yahoo.com.ar");
  assert.equal(P.propietario("-", "-", "-"), null);
});
t("planilla: fila completa y operación deducida", () => {
  const fila = (estado: string, precio: string) =>
    ["6348356", "2025-05-16 16:13:24", "garc1-084", estado, "Jose Ramon Vidal 1768", "Corrientes, Corrientes, Corrientes", "Juan  Ignacio", "Departamento", "35 m2", "-", "-", "5 años", "Monoamb.", "-", "-", "-", "-", "-", "-", precio, "-", "-", "-", "-"];
  const a = P.leerFila(fila("Alquilado", "U$D 500"));
  assert.ok(!("error" in a));
  if (!("error" in a)) {
    assert.equal(a.code, "84");
    assert.equal(a.operationType, "For Rent");
    assert.equal(a.operacionDeducida, false);
    assert.equal(a.rooms, 0);
    assert.equal(a.responsable, "Juan Ignacio");
  }
  const s = P.leerFila(fila("Suspendido", "U$D 90.000"));
  assert.ok(!("error" in s) && s.operationType === "For Sale" && s.operacionDeducida);
  assert.ok("error" in P.leerFila(fila("Raro", "-")));
});
t("planilla: altura de la dirección", () => {
  assert.equal(P.alturaDeDireccion("Lavalle 1170 1° 3"), "1170");
  assert.equal(P.alturaDeDireccion("Avenida Independencia 4600"), "4600");
  assert.equal(P.alturaDeDireccion("Ruta 12 Y Avenida Libertad"), "12");
  assert.equal(P.alturaDeDireccion("Belgrano"), null);
});
t("dirección pública: exacta o aproximada", () => {
  const base = { address: "Lavalle 1170 1° 3", addressName: "Lavalle", addressNumber: "1170" };
  assert.equal(publicAddress({ ...base, showExactAddress: true }), "Lavalle 1170 1° 3");
  assert.equal(publicAddress({ ...base, showExactAddress: false }), "Lavalle al 1100");
  assert.equal(publicAddress({ ...base, addressNumber: "85", showExactAddress: false }), "Lavalle");
  assert.equal(publicAddress({ ...base, addressNumber: null, showExactAddress: false }), "Lavalle");
});
t("vinculación: comparar direcciones del Historial con la ficha", () => {
  assert.equal(compararDirecciones("Gdor Gallino 285", "Gobernador Gallino 285 2°"), "coincide");
  assert.equal(compararDirecciones("AVENIDA INDEPENDENCIA 4159 / 4163", "Avenida Independencia 4159"), "coincide");
  assert.equal(compararDirecciones("Junin 342 primer piso", "Junin 342 1°"), "coincide");
  assert.equal(compararDirecciones("Cordoba 1050 EDIFICIO ALMERIA", "Cordoba 1050"), "coincide");
  assert.equal(compararDirecciones("328 VIVIENDAS MANZANA K CASA 134", "328 Viviendas"), "coincide");
  assert.equal(compararDirecciones("Junin 1336", "Junin 2062"), "distinta");
  assert.equal(compararDirecciones("LAVALLE 1170", "Lavalle 1100 1°"), "distinta");
  assert.equal(compararDirecciones("lavalle 1202", "Mendoza Esquina Lavalle"), "parecida");
  assert.equal(compararDirecciones("Bonaire - amoblado", "Belgrano 1468"), "distinta");
  assert.equal(compararDirecciones(null, "Belgrano 1468"), "distinta");
});
console.log(`\n${n} pruebas OK`);

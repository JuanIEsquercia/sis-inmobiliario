// Pruebas de las funciones puras (sin base de datos): turnos y estados
// de visitas, códigos de propiedad y reparto de características de Adinco.
// Uso: npm test
import assert from "node:assert/strict";
import * as R from "../../src/lib/visit-rules";
import { normalizarCodigo, codigoMaximo } from "../../src/lib/property-codes";
import { clasificarCaracteristicas } from "../../src/lib/property-features";

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
console.log(`\n${n} pruebas OK`);

import { RentCalculatorEmbed } from "@/components/RentCalculatorEmbed";

interface IndiceInfo {
  title: string;
  description: string;
}

// Contenido verificado contra fuentes oficiales antes de publicarlo (BCRA
// para ICL, INDEC para IPC/CVS) — ver conversación: esto sale en el sitio
// público, un dato mal explicado acá induce a error real sobre cuánto
// paga o cobra alguien.
const indices: IndiceInfo[] = [
  {
    title: "ICL (BCRA)",
    description:
      "Combina, en partes iguales, inflación (IPC) y salarios (RIPTE, remuneración de trabajadores registrados). A diferencia del IPC, se actualiza todos los días — no hay que esperar una publicación mensual, el valor de cualquier fecha ya está disponible al momento. Fue el índice obligatorio para alquileres de vivienda hasta que se derogó la ley de alquileres a fines de 2023; sigue siendo el más elegido porque ya lo conocen tanto inquilinos como propietarios.",
  },
  {
    title: "IPC (INDEC)",
    description:
      "Mide directamente la inflación mensual — hoy es el más elegido para contratos nuevos. Para períodos de más de un mes el cálculo es multiplicativo (compuesto), nunca se suman los porcentajes.",
  },
  {
    title: "Casa Propia / Hog.AR",
    description:
      "Toma el menor valor entre la variación de salarios (CVS, INDEC) y la inflación (CER, BCRA) de los últimos 12 meses — pensado para que el alquiler nunca le gane a los sueldos. Se ajusta cada 6 meses.",
  },
  {
    title: "Acuerdo libre",
    description:
      "Desde que se derogó la ley de alquileres (fines de 2023), no hay ningún índice obligatorio — propietario e inquilino pueden pactar el que quieran, la frecuencia del ajuste, o directamente un porcentaje fijo.",
  },
];

export function CalculadoraAlquilerSection() {
  return (
    <section>
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">¿Cuánto va a aumentar tu alquiler?</h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted">
          Te explicamos cómo se calcula cada índice y usá la calculadora para saber tu próximo monto.
        </p>
      </div>

      {/* Aclaración central — el punto que más confunde: qué valor de
          índice corresponde usar según la fecha del ajuste. */}
      <div className="mb-8 rounded-2xl border border-accent/15 bg-accent-soft/30 p-6">
        <h3 className="mb-2 text-sm font-bold text-foreground">
          Siempre se usa el índice publicado, no el del mes de la actualización
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          El INDEC publica el IPC de un mes recién a mediados del mes siguiente, alrededor del día 15 (ej.: el IPC de
          agosto se publica el 15 de septiembre). Por eso, al calcular una actualización, siempre se toma el último
          índice ya publicado — nunca el del mes en que cae el ajuste, porque ese dato todavía no existe.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          <strong>Ejemplo:</strong> tu contrato se actualiza en octubre → se usa el IPC de <strong>agosto</strong>{" "}
          (el último publicado, el 15 de septiembre) — no el de octubre ni el de septiembre, que recién se publica el
          15 de octubre.
        </p>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {indices.map((indice) => (
          <div key={indice.title} className="rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
            <h3 className="mb-1.5 text-base font-semibold text-foreground">{indice.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{indice.description}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex justify-center">
        <a
          href="#calculadora"
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/10 transition-all hover:bg-accent-strong hover:scale-[1.01] active:scale-[0.99]"
        >
          Calculá tu aumento
        </a>
      </div>

      <div id="calculadora" className="scroll-mt-20 overflow-x-auto">
        <RentCalculatorEmbed />
        <p className="mt-3 text-center text-xs text-muted">Vía arquiler.com.</p>
      </div>
    </section>
  );
}

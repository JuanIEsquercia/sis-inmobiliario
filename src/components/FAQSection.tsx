interface FAQItem {
  question: string;
  answer: string;
}

// Contenido revisado y aprobado en conversación (no inventado): costo de
// tasación, alternativa de garante vía seguro de caución sujeta al
// propietario, y horarios confirmados por el usuario. A propósito con
// más preguntas generales que de alquiler — no es solo una inmobiliaria
// de alquileres.
const faqs: FAQItem[] = [
  {
    question: "¿Qué servicios ofrece García Propiedades?",
    answer: "Tasaciones, ventas, alquileres y administración de alquileres.",
  },
  {
    question: "¿Qué tipo de propiedades manejan?",
    answer: "Casas, departamentos, campos y terrenos en Corrientes.",
  },
  {
    question: "¿Tiene costo la tasación?",
    answer: "Sí, es una tasación formal con informe e imágenes.",
  },
  {
    question: "¿Cómo es el proceso si quiero vender mi propiedad?",
    answer:
      "Te acompañamos de punta a punta: tasación, publicación, visitas y todo el proceso de compraventa, cuidando cada detalle hasta la escritura.",
  },
  {
    question: "¿Qué documentación se pide para alquilar?",
    answer:
      "DNI, comprobante de ingresos e informe BCRA del inquilino y del garante. Si no tenés garante propio, trabajamos con empresas que ofrecen seguro de caución como alternativa — queda sujeto a que el propietario lo acepte.",
  },
  {
    question: "¿Cómo se actualiza el monto del alquiler?",
    answer: "Con el índice pactado (ICL, IPC, Casa Propia, o lo acordado) — ver la calculadora de arriba.",
  },
  {
    question: "¿Cuál es el horario de atención?",
    answer: "De 9 a 17, de corrido, en Mendoza 1055, Corrientes — contamos con cochera para clientes.",
  },
  {
    question: "¿Cómo los contacto?",
    answer: "Por WhatsApp, el formulario de la web, o acercándote a Mendoza 1055.",
  },
];

// FAQPage — Google dejó de mostrar el acordeón de FAQ como rich result
// para sitios comunes desde agosto 2023 (solo lo conserva para sitios
// de gobierno/salud "autoritativos"), así que esto no va a producir esa
// viñeta especial en el buscador clásico. Se deja igual porque sigue
// siendo un dato estructurado válido, y porque las respuestas de
// buscadores con IA (Google AI Overviews, etc.) sí lo usan como fuente.
function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function FAQSection() {
  return (
    <section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }} />

      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">Preguntas frecuentes</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Lo que más nos preguntan sobre tasaciones, ventas y alquileres.
        </p>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-border/60 bg-surface p-5 shadow-sm open:shadow-premium"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground marker:content-none">
              {faq.question}
              <svg
                className="h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-open:rotate-45"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

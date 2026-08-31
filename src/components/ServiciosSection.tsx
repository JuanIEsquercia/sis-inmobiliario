import Link from "next/link";

interface Servicio {
  title: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  className: "h-6 w-6",
};

const servicios: Servicio[] = [
  {
    title: "Tasaciones",
    description: "Valuamos tu propiedad con criterio de mercado real, para vender, alquilar o simplemente saber cuánto vale.",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7.5h6M9 12h6M9 16.5h3M5.25 3.75h13.5A1.5 1.5 0 0 1 20.25 5.25v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z" />
      </svg>
    ),
  },
  {
    title: "Ventas",
    description: "Acompañamos todo el proceso de compraventa, de punta a punta, cuidando cada detalle de la operación.",
    href: "/propiedades?operacion=For Sale",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.204 3.045a1.125 1.125 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    title: "Alquileres",
    description: "Te ayudamos a encontrar el inquilino o la propiedad ideal, con contratos claros desde el primer día.",
    href: "/propiedades?operacion=For Rent",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h.008M20.25 12h-.008M12 3.75v.008M12 20.25v-.008M6.166 6.166l.005.005M17.834 17.834l.005.005M6.166 17.834l.005-.005M17.834 6.166l.005-.005" />
      </svg>
    ),
  },
  {
    title: "Administración de alquileres",
    description: "Gestionamos el día a día del contrato por vos: cobros, actualizaciones y liquidaciones al propietario.",
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5.25 21V7.5A1.5 1.5 0 0 1 6.75 6h4.5a1.5 1.5 0 0 1 1.5 1.5V21M9 9.75h1.5M9 12.75h1.5M15.75 21v-6a1.5 1.5 0 0 1 1.5-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v6" />
      </svg>
    ),
  },
];

function ServicioCard({ servicio }: { servicio: Servicio }) {
  const content = (
    <>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {servicio.icon}
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-foreground">{servicio.title}</h3>
      <p className="text-sm leading-relaxed text-muted">{servicio.description}</p>
    </>
  );

  const className =
    "flex flex-col rounded-2xl border border-border/60 bg-surface p-6 shadow-sm transition-all duration-300" +
    (servicio.href ? " hover:-translate-y-1 hover:shadow-premium" : "");

  if (servicio.href) {
    return (
      <Link href={servicio.href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

export function ServiciosSection() {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Nuestros servicios</h2>
        <p className="text-sm text-muted">Todo lo que necesitás para comprar, vender o alquilar, en un solo lugar.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {servicios.map((servicio) => (
          <ServicioCard key={servicio.title} servicio={servicio} />
        ))}
      </div>
    </section>
  );
}

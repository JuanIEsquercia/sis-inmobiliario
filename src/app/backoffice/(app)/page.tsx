import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";

export default async function BackofficeDashboard() {
  const [pedidosAbiertos, contratosActivos, pagosPendientes] = await withRetry(() =>
    Promise.all([
      prisma.pedido.count({ where: { estado: { in: ["ABIERTO", "EN_BUSQUEDA"] } } }),
      prisma.contract.count({ where: { status: "ACTIVO" } }),
      prisma.payment.count({ where: { status: { in: ["PENDIENTE", "ENVIADA", "PARCIAL"] } } }),
    ])
  );

  const cards = [
    { 
      label: "Pedidos abiertos", 
      value: pedidosAbiertos, 
      href: "/backoffice/pedidos",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.008m0-.008a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM9 12v.008m0-.008a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM9 7.5v.008m0-.008a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
        </svg>
      )
    },
    { 
      label: "Contratos activos", 
      value: contratosActivos, 
      href: "/backoffice/administraciones",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      )
    },
    { 
      label: "Pagos pendientes", 
      value: pagosPendientes, 
      href: "/backoffice/administraciones",
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
        </svg>
      )
    },
  ];

  return (
    <div>
      <h1 className="mb-8 text-xl font-bold tracking-tight text-foreground uppercase">Resumen del Panel</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-premium hover:border-accent/20 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-extrabold tracking-tight text-foreground group-hover:text-accent transition-colors duration-250">
                  {c.value}
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted">
                  {c.label}
                </p>
              </div>
              <div className="rounded-xl bg-accent/5 p-2.5 border border-accent/10">
                {c.icon}
              </div>
            </div>
            
            <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-bold uppercase tracking-wider text-muted group-hover:text-accent transition-colors">
              <span>Ver Listado</span>
              <svg 
                viewBox="0 0 24 24" 
                width="14" 
                height="14" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                className="transform group-hover:translate-x-1 transition-transform"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


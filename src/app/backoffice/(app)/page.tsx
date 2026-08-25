import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";

export default async function BackofficeDashboard() {
  const [pedidosAbiertos, contratosActivos, pagosPendientes] = await withRetry(() =>
    Promise.all([
      prisma.pedido.count({ where: { estado: { in: ["ABIERTO", "EN_BUSQUEDA"] } } }),
      prisma.contract.count({ where: { status: "ACTIVO" } }),
      prisma.payment.count({ where: { status: { in: ["PENDIENTE", "ATRASADO"] } } }),
    ])
  );

  const cards = [
    { label: "Pedidos abiertos", value: pedidosAbiertos, href: "/backoffice/pedidos" },
    { label: "Contratos activos", value: contratosActivos, href: "/backoffice/alquileres" },
    { label: "Pagos pendientes", value: pagosPendientes, href: "/backoffice/alquileres" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">Panel</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-border p-5 transition-colors hover:bg-surface"
          >
            <p className="text-3xl font-semibold text-foreground">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Fuente única de verdad para la navegación del backoffice — la usa el
// Sidebar (con sus propios íconos, definidos aparte) y el buscador
// global (Ctrl+K) para poder saltar directo a una sección o subsección
// sin pasar por el menú. Un cambio acá se refleja en los dos lugares.
export interface NavChild {
  href: string;
  label: string;
  permission?: string;
}

export interface NavSection {
  href: string;
  label: string;
  permission: string | null;
  children?: NavChild[];
}

export const NAV_SECTIONS: NavSection[] = [
  { href: "/backoffice", label: "Panel", permission: null },
  { href: "/backoffice/pedidos", label: "Pedidos", permission: "pedidos.ver" },
  {
    href: "/backoffice/administraciones",
    label: "Administraciones",
    permission: "administraciones.ver",
    children: [
      { href: "/backoffice/administraciones", label: "Contratos" },
      { href: "/backoffice/administraciones/liquidaciones", label: "Liquidaciones" },
      { href: "/backoffice/administraciones/actualizaciones", label: "Actualizaciones" },
      { href: "/backoffice/administraciones/morosidad", label: "Morosidad" },
    ],
  },
  {
    href: "/backoffice/caja",
    label: "Caja",
    permission: "caja.ver",
    children: [
      { href: "/backoffice/caja", label: "Movimientos" },
      { href: "/backoffice/caja/ventas", label: "Ventas" },
      { href: "/backoffice/caja/tasaciones", label: "Tasaciones" },
      { href: "/backoffice/caja/comisiones", label: "Comisión alquileres" },
      { href: "/backoffice/caja/administracion", label: "Administración" },
      { href: "/backoffice/caja/egresos", label: "Egresos" },
      { href: "/backoffice/caja/consolidado", label: "Consolidado" },
      { href: "/backoffice/caja/proyeccion", label: "Proyección" },
    ],
  },
  { href: "/backoffice/historial", label: "Historial", permission: "historial.ver" },
  { href: "/backoffice/clientes", label: "Clientes", permission: "clientes.ver" },
  {
    href: "/backoffice/central-deudores",
    label: "Central de Deudores",
    // Mismo permiso que crear contratos — ver comentario en actions.ts.
    permission: "administraciones.crear",
  },
  {
    href: "/backoffice/presupuestos",
    label: "Presupuestador",
    permission: "presupuestos.ver",
    children: [
      { href: "/backoffice/presupuestos", label: "Presupuestos" },
      { href: "/backoffice/presupuestos/conceptos", label: "Conceptos", permission: "presupuestos.conceptos.gestionar" },
    ],
  },
  {
    href: "/backoffice/agentes",
    label: "Pagos a agentes",
    permission: null,
    children: [
      { href: "/backoffice/agentes", label: "Saldos" },
      { href: "/backoffice/agentes/esquema", label: "Esquema de comisiones", permission: "comisiones.ver" },
    ],
  },
  {
    href: "/backoffice/usuarios",
    label: "Usuarios",
    permission: "usuarios.ver",
    children: [
      { href: "/backoffice/usuarios", label: "Usuarios" },
      { href: "/backoffice/usuarios/grupos", label: "Grupos de contratos", permission: "administraciones.grupos.gestionar" },
    ],
  },
  { href: "/backoffice/sitio", label: "Sitio público", permission: "sitio.gestionar" },
];

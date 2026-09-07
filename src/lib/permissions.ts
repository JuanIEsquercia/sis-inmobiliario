import type { StaffRole } from "@/generated/prisma/client";

export interface PermissionLeaf {
  key: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  children: PermissionLeaf[];
}

export const PERMISSION_TREE: PermissionGroup[] = [
  {
    key: "pedidos",
    label: "Pedidos",
    children: [
      { key: "pedidos.ver", label: "Ver pedidos" },
      { key: "pedidos.crear", label: "Crear pedidos" },
      { key: "pedidos.estado", label: "Cambiar estado y tomar pedidos" },
    ],
  },
  {
    key: "administraciones",
    label: "Administraciones",
    children: [
      { key: "administraciones.ver", label: "Ver contratos" },
      // Desde que el scope por cartera también gobierna las acciones
      // (ver assertContractInScope), esto no es solo "ver": es la llave
      // que saca la restricción de cartera para todo.
      { key: "administraciones.ver_todos", label: "Sin restricción de cartera — ver y operar contratos de cualquier grupo" },
      { key: "administraciones.crear", label: "Crear contratos" },
      { key: "administraciones.pagos", label: "Registrar pagos" },
      { key: "administraciones.indexacion", label: "Aplicar indexaciones" },
      { key: "administraciones.firmar", label: "Marcar una colocación como firmada" },
      { key: "administraciones.eliminar", label: "Eliminar contratos definitivamente (con todo lo vinculado)" },
      { key: "administraciones.grupos.gestionar", label: "Crear grupos y asignar contratos/miembros" },
    ],
  },
  {
    key: "central_deudores",
    label: "Central de Deudores (BCRA)",
    children: [
      { key: "central_deudores.consultar", label: "Consultar informes crediticios y exportarlos" },
      { key: "central_deudores.eliminar", label: "Eliminar consultas guardadas" },
    ],
  },
  {
    key: "caja",
    label: "Caja",
    children: [
      { key: "caja.ver", label: "Ver caja (movimientos, ventas, tasaciones, comisiones, egresos)" },
      { key: "caja.ventas.crear", label: "Cargar ventas" },
      { key: "caja.tasaciones.crear", label: "Cargar tasaciones" },
      { key: "caja.comisiones.crear", label: "Cargar comisiones de alquiler" },
      { key: "caja.administracion.confirmar", label: "Confirmar cobro de comisión de administración" },
      { key: "caja.comisiones.confirmar", label: "Confirmar cobro de comisión de alquiler/renovación" },
      { key: "caja.tasaciones.confirmar", label: "Confirmar cobro de tasación" },
      { key: "caja.gastos.crear", label: "Cargar egresos/gastos" },
      // Separados de caja.ver a propósito: son los números del negocio
      // entero (resultado mensual, proyección), no lo operativo del día
      // a día que necesita cualquiera que carga una venta.
      { key: "caja.consolidado.ver", label: "Ver el consolidado mensual (resultado del negocio)" },
      { key: "caja.proyeccion.ver", label: "Ver la proyección financiera" },
      { key: "caja.proyeccion.configurar", label: "Ajustar parámetros de la proyección financiera" },
    ],
  },
  {
    key: "agentes",
    label: "Pagos a agentes",
    children: [
      { key: "agentes.ver_todos", label: "Ver el saldo de todos los agentes" },
      { key: "agentes.pagos.crear", label: "Registrar pagos a agentes" },
    ],
  },
  {
    key: "comisiones",
    label: "Esquema de comisiones",
    children: [
      { key: "comisiones.ver", label: "Ver esquema de comisiones" },
      { key: "comisiones.gestionar", label: "Editar esquema de comisiones" },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    children: [
      { key: "clientes.ver", label: "Ver clientes" },
      { key: "clientes.gestionar", label: "Editar datos de contacto" },
    ],
  },
  {
    key: "historial",
    label: "Historial",
    children: [{ key: "historial.ver", label: "Ver historial de propiedades (incluye montos de ventas y tasaciones)" }],
  },
  {
    key: "presupuestos",
    label: "Presupuestador",
    children: [
      { key: "presupuestos.ver", label: "Ver presupuestos" },
      { key: "presupuestos.crear", label: "Crear presupuestos" },
      { key: "presupuestos.conceptos.gestionar", label: "Gestionar catálogo de conceptos" },
    ],
  },
  {
    key: "usuarios",
    label: "Usuarios",
    children: [
      { key: "usuarios.ver", label: "Ver usuarios" },
      { key: "usuarios.gestionar", label: "Crear y editar usuarios" },
    ],
  },
  {
    key: "sitio",
    label: "Sitio público",
    children: [{ key: "sitio.gestionar", label: "Administrar logos de marcas del sitio público" }],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_TREE.flatMap((g) =>
  g.children.map((c) => c.key)
);

// Dependencias implícitas: tener la clave de la izquierda implica tener
// las de la derecha. El árbol es plano y sin esto se podía dar, por
// ejemplo, "Registrar pagos" sin "Ver contratos" — un permiso inútil
// (la sección ni aparece) o a medias (Central de Deudores visible sin
// Administraciones). Se expande en dos lugares: al cargar el perfil
// (getCurrentProfile — lo que realmente manda) y en el árbol de la UI
// (tildar un hijo tilda lo que implica), para que lo que se ve al
// editar coincida con lo que va a regir.
export const PERMISSION_IMPLIES: Record<string, string[]> = {
  "pedidos.crear": ["pedidos.ver"],
  "pedidos.estado": ["pedidos.ver"],
  "administraciones.ver_todos": ["administraciones.ver"],
  "administraciones.crear": ["administraciones.ver"],
  "administraciones.pagos": ["administraciones.ver"],
  "administraciones.indexacion": ["administraciones.ver"],
  "administraciones.firmar": ["administraciones.ver"],
  "administraciones.eliminar": ["administraciones.ver"],
  // La pantalla de grupos vive bajo Usuarios — sin usuarios.ver la
  // sección no aparece en el menú.
  "administraciones.grupos.gestionar": ["administraciones.ver", "usuarios.ver"],
  "central_deudores.eliminar": ["central_deudores.consultar"],
  "caja.ventas.crear": ["caja.ver"],
  "caja.tasaciones.crear": ["caja.ver"],
  "caja.comisiones.crear": ["caja.ver"],
  "caja.administracion.confirmar": ["caja.ver"],
  "caja.comisiones.confirmar": ["caja.ver"],
  "caja.tasaciones.confirmar": ["caja.ver"],
  "caja.gastos.crear": ["caja.ver"],
  "caja.consolidado.ver": ["caja.ver"],
  "caja.proyeccion.ver": ["caja.ver"],
  "caja.proyeccion.configurar": ["caja.proyeccion.ver"],
  // Pagarle a otro agente exige poder ver su saldo.
  "agentes.pagos.crear": ["agentes.ver_todos"],
  "comisiones.gestionar": ["comisiones.ver"],
  "clientes.gestionar": ["clientes.ver"],
  "presupuestos.crear": ["presupuestos.ver"],
  "presupuestos.conceptos.gestionar": ["presupuestos.ver"],
  "usuarios.gestionar": ["usuarios.ver"],
};

// Cierre transitivo de PERMISSION_IMPLIES sobre un set de claves
// (proyeccion.configurar ⇒ proyeccion.ver ⇒ caja.ver). Devuelve una
// lista nueva; no muta la de entrada.
export function expandPermissions(keys: string[]): string[] {
  const result = new Set(keys);
  const queue = [...keys];
  while (queue.length > 0) {
    const key = queue.pop()!;
    for (const implied of PERMISSION_IMPLIES[key] ?? []) {
      if (!result.has(implied)) {
        result.add(implied);
        queue.push(implied);
      }
    }
  }
  return [...result];
}

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, string[]> = {
  ADMIN: ALL_PERMISSION_KEYS,
  AGENTE: [
    "pedidos.ver",
    "pedidos.crear",
    "pedidos.estado",
    "administraciones.ver",
    "administraciones.crear",
    "administraciones.pagos",
    "central_deudores.consultar",
    "clientes.ver",
    "clientes.gestionar",
    "caja.ver",
    "caja.ventas.crear",
    "caja.tasaciones.crear",
    "caja.comisiones.crear",
    "presupuestos.ver",
    "presupuestos.crear",
  ],
};

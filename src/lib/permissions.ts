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
      { key: "pedidos.estado", label: "Cambiar estado" },
    ],
  },
  {
    key: "administraciones",
    label: "Administraciones",
    children: [
      { key: "administraciones.ver", label: "Ver contratos" },
      { key: "administraciones.crear", label: "Crear contratos" },
      { key: "administraciones.pagos", label: "Registrar pagos" },
      { key: "administraciones.indexacion", label: "Aplicar indexaciones" },
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
    key: "usuarios",
    label: "Usuarios",
    children: [
      { key: "usuarios.ver", label: "Ver usuarios" },
      { key: "usuarios.gestionar", label: "Crear y editar usuarios" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_TREE.flatMap((g) =>
  g.children.map((c) => c.key)
);

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, string[]> = {
  ADMIN: ALL_PERMISSION_KEYS,
  AGENTE: [
    "pedidos.ver",
    "pedidos.crear",
    "pedidos.estado",
    "administraciones.ver",
    "administraciones.crear",
    "administraciones.pagos",
    "clientes.ver",
  ],
};

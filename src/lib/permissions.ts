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
    key: "alquileres",
    label: "Alquileres",
    children: [
      { key: "alquileres.ver", label: "Ver contratos" },
      { key: "alquileres.crear", label: "Crear contratos" },
      { key: "alquileres.pagos", label: "Registrar pagos" },
      { key: "alquileres.indexacion", label: "Aplicar indexaciones" },
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
    "alquileres.ver",
    "alquileres.crear",
    "alquileres.pagos",
  ],
};

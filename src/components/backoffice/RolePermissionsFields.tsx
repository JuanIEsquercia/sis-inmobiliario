"use client";

import { useRef } from "react";
import { PermissionTree } from "@/components/backoffice/PermissionTree";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";
import type { StaffRole } from "@/generated/prisma/client";

interface RolePermissionsFieldsProps {
  defaultRole: StaffRole;
  defaultPermissions: string[];
}

export function RolePermissionsFields({ defaultRole, defaultPermissions }: RolePermissionsFieldsProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  function applyRoleDefaults(role: StaffRole) {
    const defaults = ROLE_DEFAULT_PERMISSIONS[role];
    const form = wrapperRef.current?.closest("form");
    if (!form) return;
    form.querySelectorAll<HTMLInputElement>('input[name="permissions"]').forEach((input) => {
      input.checked = defaults.includes(input.value);
    });
    // Los checkboxes de módulo escuchan "change" en el form para
    // recalcular su estado (todo/algo/nada tildado) — dispararlo a mano
    // porque los toggles de arriba fueron programáticos, no clicks.
    form.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="role" className="text-sm font-medium text-foreground">
          Rol
        </label>
        <select
          id="role"
          name="role"
          defaultValue={defaultRole}
          onChange={(e) => applyRoleDefaults(e.target.value as StaffRole)}
          className="field w-fit"
        >
          <option value="AGENTE">Agente</option>
          <option value="ADMIN">Admin</option>
        </select>
        <p className="text-xs text-muted">Cambiar el rol precarga sus permisos por defecto — se pueden ajustar abajo.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Permisos</p>
        <PermissionTree defaultChecked={defaultPermissions} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { PERMISSION_TREE } from "@/lib/permissions";

interface PermissionTreeProps {
  defaultChecked: string[];
}

function GroupCheckbox({ childKeys }: { childKeys: string[] }) {
  const ref = useRef<HTMLInputElement>(null);

  function sync() {
    const input = ref.current;
    const form = input?.closest("form");
    if (!input || !form) return;

    const children = childKeys
      .map((key) => form.querySelector<HTMLInputElement>(`input[type="checkbox"][value="${key}"]`))
      .filter((el): el is HTMLInputElement => !!el);

    const checkedCount = children.filter((c) => c.checked).length;
    input.checked = checkedCount > 0 && checkedCount === children.length;
    input.indeterminate = checkedCount > 0 && checkedCount < children.length;
  }

  useEffect(() => {
    sync();
    const form = ref.current?.closest("form");
    form?.addEventListener("change", sync);
    return () => form?.removeEventListener("change", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGroupChange(checked: boolean) {
    const form = ref.current?.closest("form");
    if (!form) return;
    for (const key of childKeys) {
      const input = form.querySelector<HTMLInputElement>(`input[type="checkbox"][value="${key}"]`);
      if (input) input.checked = checked;
    }
    sync();
  }

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Todo el módulo"
      onChange={(e) => handleGroupChange(e.target.checked)}
      className="h-4 w-4 accent-accent"
    />
  );
}

export function PermissionTree({ defaultChecked }: PermissionTreeProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
      {PERMISSION_TREE.map((group) => (
        <div key={group.key}>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
            <GroupCheckbox childKeys={group.children.map((c) => c.key)} />
            {group.label}
          </label>
          <div className="ml-6 flex flex-col gap-1.5 border-l border-border pl-4">
            {group.children.map((leaf) => (
              <label key={leaf.key} className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  name="permissions"
                  value={leaf.key}
                  defaultChecked={defaultChecked.includes(leaf.key)}
                  className="h-4 w-4 accent-accent"
                />
                {leaf.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import type { KeyLocation } from "@/generated/prisma/client";

// Dónde está la llave de una propiedad, para mostrar en el pedido de
// llave, en la tarjeta de visita y en la ficha.
export function LlaveResumen({
  l,
}: {
  l: {
    keyLocation: KeyLocation | null;
    keyNumber: string | null;
    keySets: number | null;
    keyNotes: string | null;
    keyContactRelation: string | null;
    keyContact: { firstName: string; lastName: string; phone: string | null } | null;
  };
}) {
  if (!l.keyLocation) {
    return <p className="text-sm text-muted">Sin llave indicada.</p>;
  }
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3 text-sm">
      {l.keyLocation === "INMOBILIARIA" ? (
        <p className="font-medium text-foreground">
          🔑 Retirar de la inmobiliaria{l.keyNumber ? ` — llavero ${l.keyNumber}` : ""}
        </p>
      ) : (
        <p className="font-medium text-foreground">
          🔑 La tiene {l.keyContact ? `${l.keyContact.firstName} ${l.keyContact.lastName}` : "un contacto"}
          {l.keyContactRelation ? ` (${l.keyContactRelation})` : ""}
          {l.keyContact?.phone ? ` · ${l.keyContact.phone}` : ""}
        </p>
      )}
      {(l.keySets || l.keyNotes) && (
        <p className="mt-1 text-xs text-muted">
          {l.keySets ? `${l.keySets} juego(s). ` : ""}
          {l.keyNotes}
        </p>
      )}
    </div>
  );
}

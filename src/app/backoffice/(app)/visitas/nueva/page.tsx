import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { normalizarCodigo } from "@/lib/property-codes";
import { diaArgentina, diaComoFecha, horaArgentina } from "@/lib/visit-rules";
import { ActionForm } from "@/components/backoffice/ActionForm";
import { SubmitButton } from "@/components/backoffice/SubmitButton";
import { TurnoPicker } from "@/components/backoffice/TurnoPicker";
import { InteresadoPicker } from "@/components/backoffice/InteresadoPicker";
import { LlaveResumen } from "@/components/backoffice/LlaveResumen";
import { pedirLlave } from "../actions";

interface PageProps {
  searchParams: Promise<{ propiedad?: string; codigo?: string }>;
}

export default async function PedirLlavePage({ searchParams }: PageProps) {
  await requirePermission("visitas.pedir");
  const { propiedad, codigo } = await searchParams;

  // Sin propiedad elegida: se busca por código.
  if (!propiedad) {
    let noEncontrada = false;
    if (codigo) {
      const n = normalizarCodigo(codigo);
      const l = n ? await withRetry(() => prisma.listing.findFirst({ where: { code: n }, select: { id: true } })) : null;
      if (l) redirect(`/backoffice/visitas/nueva?propiedad=${l.id}`);
      noEncontrada = true;
    }
    return (
      <div className="max-w-xl">
        <h1 className="mb-1 text-xl font-semibold text-foreground">Pedir llave</h1>
        <p className="mb-6 text-sm text-muted">Elegí la propiedad por su código. También se puede pedir desde la ficha de la propiedad.</p>
        <form className="flex gap-2">
          <input name="codigo" defaultValue={codigo} placeholder="Código de propiedad" className="field flex-1" autoFocus />
          <button type="submit" className="rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground cursor-pointer">Buscar</button>
        </form>
        {noEncontrada && <p className="mt-3 text-sm text-destructive">No hay una propiedad con el código {codigo}.</p>}
      </div>
    );
  }

  const listingId = Number(propiedad);
  const hoy = diaArgentina();
  const [listing, tomados, pedidos] = await withRetry(() =>
    Promise.all([
      prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          code: true,
          address: true,
          contentTitle: true,
          title: true,
          keyLocation: true,
          keyNumber: true,
          keySets: true,
          keyNotes: true,
          keyContactRelation: true,
          keyContact: { select: { firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.visit.findMany({
        where: { listingId, status: { not: "CANCELADA" }, date: { gte: diaComoFecha(hoy) } },
        select: { date: true, slot: true },
      }),
      prisma.pedido.findMany({
        where: { estado: { in: ["ABIERTO", "EN_BUSQUEDA"] } },
        select: { id: true, clienteNombre: true, zona: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ])
  );
  if (!listing) redirect("/backoffice/visitas/nueva");

  return (
    <div className="max-w-3xl w-full mx-auto">
      <Link href={`/backoffice/propiedades/${listing.id}`} className="mb-2 inline-block text-xs text-accent hover:underline">
        ← Ficha de la propiedad
      </Link>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Pedir llave para visita</h1>
      <p className="mb-6 text-sm text-muted">
        Código {listing.code ?? "—"} · {listing.address ?? listing.contentTitle ?? listing.title}
      </p>

      <div className="mb-6">
        <LlaveResumen l={listing} />
      </div>

      {!listing.keyLocation ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Esta propiedad no tiene indicado dónde está la llave, así que todavía no se puede pedir. Cargalo en la sección
          &quot;Llave&quot; de la{" "}
          <Link href={`/backoffice/propiedades/${listing.id}`} className="underline">ficha</Link>.
        </p>
      ) : (
        <ActionForm action={pedirLlave} mensajeExito="Llave pedida" className="flex flex-col gap-5">
          <input type="hidden" name="listingId" value={listing.id} />
          <TurnoPicker
            hoy={hoy}
            ahora={horaArgentina()}
            tomados={tomados.map((t) => ({ dia: t.date.toISOString().slice(0, 10), slot: t.slot }))}
          />
          <InteresadoPicker pedidos={pedidos} />
          <div>
            <SubmitButton pendingLabel="Pidiendo..." className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer">
              Pedir llave
            </SubmitButton>
          </div>
        </ActionForm>
      )}
    </div>
  );
}

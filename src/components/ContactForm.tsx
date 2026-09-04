"use client";

import { useActionState } from "react";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { crearPedidoPublico } from "@/app/(site)/actions";

interface ContactFormState {
  ok: boolean;
  error?: string;
}

const initialState: ContactFormState = { ok: false };

// Misma estructura de campos que el alta de Pedido del backoffice
// (createPedido) — para que quien lo mira ahí no tenga que aprender
// nada nuevo, es el mismo pedido, solo que entra sin login (ver
// crearPedidoPublico) y por eso queda con creadoPorId null.
export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ContactFormState, formData: FormData) => crearPedidoPublico(formData),
    initialState
  );

  if (state.ok) {
    return (
      <div className="rounded-[2rem] border border-accent/30 bg-accent-soft/20 p-8 sm:p-10 text-center">
        <h3 className="mb-2 text-lg font-semibold text-foreground">¡Gracias por escribirnos!</h3>
        <p className="text-sm text-muted">
          Recibimos tu consulta — un agente de García Propiedades se va a poner en contacto a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-[2rem] border border-border/80 bg-surface/95 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]"
    >
      {/* Honeypot — invisible para una persona real, un bot que completa
          todos los inputs sí lo llena (ver crearPedidoPublico). */}
      <input
        type="text"
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input
          name="clienteNombre"
          required
          placeholder="Nombre completo *"
          className="h-12 rounded-2xl border border-border/80 bg-background/70 px-4 text-sm font-medium text-foreground placeholder:text-muted/60 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <input
          name="clienteTelefono"
          placeholder="Teléfono"
          className="h-12 rounded-2xl border border-border/80 bg-background/70 px-4 text-sm font-medium text-foreground placeholder:text-muted/60 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <input
          name="clienteEmail"
          type="email"
          placeholder="Email"
          className="h-12 rounded-2xl border border-border/80 bg-background/70 px-4 text-sm font-medium text-foreground placeholder:text-muted/60 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <select
          name="operationType"
          defaultValue="Alquiler"
          className="h-12 rounded-2xl border border-border/80 bg-background/70 px-4 text-sm font-medium text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="Alquiler">Busco alquilar</option>
          <option value="Venta">Busco comprar</option>
        </select>
        <select
          name="propertyType"
          defaultValue=""
          className="h-12 rounded-2xl border border-border/80 bg-background/70 px-4 text-sm font-medium text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="">Cualquier tipo de propiedad</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          name="zona"
          placeholder="Zona de interés"
          className="h-12 rounded-2xl border border-border/80 bg-background/70 px-4 text-sm font-medium text-foreground placeholder:text-muted/60 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <div className="mb-6">
        <textarea
          name="notas"
          rows={3}
          placeholder="Contanos qué estás buscando (opcional)"
          className="w-full rounded-2xl border border-border/80 bg-background/70 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted/60 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      {state.error && <p className="mb-4 text-sm font-medium text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-accent py-3.5 text-sm font-bold text-accent-foreground shadow-sm transition-all hover:bg-accent-strong disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {pending ? "Enviando…" : "Enviar consulta"}
      </button>
    </form>
  );
}

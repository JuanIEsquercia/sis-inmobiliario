import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// Server-only: la service role key salta RLS y la Admin API por completo.
// Nunca importar este módulo desde un componente cliente.
//
// supabase-js siempre instancia un cliente Realtime, que necesita un
// WebSocket global — Node 20 (nuestro runtime) no lo trae nativo recién
// hasta Node 22, así que se lo pasamos vía el paquete "ws". No usamos
// Realtime acá, es solo para que el constructor no explote.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: WebSocket as never },
    }
  );
}

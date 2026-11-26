"use client";

import { buscarClientesPropiedades } from "@/app/backoffice/(app)/propiedades/actions";
import { ClientPicker, type ClientOption } from "./ClientPicker";

// Propietario de la ficha: buscar o crear en Clientes (campos "owner.*").
// Vacío = sin propietario cargado.
export function PropietarioPicker({ initial = null }: { initial?: ClientOption | null }) {
  return <ClientPicker namePrefix="owner" roleLabel="Propietario" initialSelected={initial} search={buscarClientesPropiedades} />;
}

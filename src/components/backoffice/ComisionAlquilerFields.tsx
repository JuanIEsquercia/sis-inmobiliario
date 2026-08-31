"use client";

import { useState, useTransition } from "react";
import { RepartoPreview, type RepartoSchemeInfo } from "./RepartoPreview";
import { refrescarEsquema } from "@/app/backoffice/(app)/caja/actions";

// Comisión de colocación (alquiler nuevo) o de renovación — son unidades
// de negocio distintas, cada una con su propio esquema de reparto (ver
// Caja › Esquema), por eso el tipo de esquema a usar depende de
// `isRenewal`. Opcional dentro de la misma alta del contrato — el monto
// siempre se puede cargar, haya o no un esquema de reparto configurado;
// sin esquema, se guarda sin repartir y se completa después. Vendedor/
// captador se cargan aparte (fieldset "Agentes", siempre visible) — acá
// solo se define si además hay un monto a cobrar.
export function ComisionAlquilerFields({
  scheme: initialScheme,
  isRenewal = false,
}: {
  scheme: RepartoSchemeInfo | null;
  isRenewal?: boolean;
}) {
  const [cobra, setCobra] = useState(false);
  const [scheme, setScheme] = useState(initialScheme);
  const [checking, startChecking] = useTransition();

  const schemeType = isRenewal ? "RENOVACION" : "ALQUILER";
  const legend = isRenewal ? "Comisión de renovación" : "Comisión de alquiler";
  const checkboxLabel = isRenewal
    ? "Cobramos comisión por esta renovación"
    : "Cobramos comisión de colocación por este alquiler";

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium text-foreground">{legend}</legend>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={cobra} onChange={(e) => setCobra(e.target.checked)} />
        {checkboxLabel}
      </label>

      {cobra && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RepartoPreview name="commissionAmount" label="Comisión" scheme={scheme} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="commissionCurrency" className="text-xs text-muted">
              Moneda
            </label>
            <select id="commissionCurrency" name="commissionCurrency" defaultValue="ARS" className="field">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="earnedAt" className="text-xs text-muted">
              Fecha de cierre
            </label>
            <input id="earnedAt" name="earnedAt" type="date" className="field" />
          </div>

          {!scheme && (
            <p className="col-span-full text-xs text-muted">
              {isRenewal
                ? "Todavía no hay un esquema de Renovaciones configurado, así que esta comisión se va a guardar entera para la inmobiliaria (podés cargarla igual)."
                : "Todavía no hay un esquema de Alquiler configurado, así que esta comisión se va a guardar sin repartir entre agente fijo/vendedor/captador (podés cargarla igual)."}{" "}
              <a href="/backoffice/agentes/esquema" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Configurar esquema en una pestaña nueva
              </a>{" "}
              y después tocar:{" "}
              <button
                type="button"
                disabled={checking}
                onClick={() => startChecking(async () => setScheme(await refrescarEsquema(schemeType)))}
                className="text-accent hover:underline disabled:opacity-60"
              >
                {checking ? "Revisando…" : "Ya lo configuré"}
              </button>
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}

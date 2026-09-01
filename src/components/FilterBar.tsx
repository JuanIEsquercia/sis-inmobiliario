"use client";

import { useState } from "react";
import { operationLabel } from "@/lib/format";

interface FilterBarProps {
  action: string;
  cities: string[];
  propertyTypes: string[];
  defaults: {
    operacion?: string;
    tipo?: string;
    ciudad?: string;
    precioMin?: string;
    precioMax?: string;
    // Ojo: en el feed de Adinco el tag <rooms> es en realidad la cantidad
    // de DORMITORIOS de la propiedad, no "ambientes" en el sentido
    // habitual (dormitorios + living/cocina) — el feed nunca completa un
    // <ambients> real (viene siempre vacío). Se filtra/etiqueta como
    // dormitorios para no prometer un dato que no es.
    dormitorios?: string;
    aptoCredito?: string;
  };
}

export function FilterBar({ action, cities, propertyTypes, defaults }: FilterBarProps) {
  const [selectedOperation, setSelectedOperation] = useState<string>(defaults.operacion ?? "");
  const [isAptoCredito, setIsAptoCredito] = useState<boolean>(defaults.aptoCredito === "true");

  // Verificar si hay algún filtro activo para mostrar el botón de reset
  const hasActiveFilters = Boolean(
    selectedOperation ||
      defaults.tipo ||
      defaults.ciudad ||
      defaults.precioMin ||
      defaults.precioMax ||
      defaults.dormitorios ||
      isAptoCredito
  );

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedOperation("");
    setIsAptoCredito(false);
    // Redirigir a la acción limpia sin parámetros de búsqueda
    window.location.href = action;
  };

  return (
    <form
      method="get"
      action={action}
      className="flex flex-col gap-6 rounded-3xl border border-border/70 bg-surface/95 p-5 sm:p-7 shadow-premium backdrop-blur-md transition-all duration-300 hover:border-border"
    >
      <input type="hidden" name="operacion" value={selectedOperation} />
      {isAptoCredito && <input type="hidden" name="aptoCredito" value="true" />}

      {/* Cabecera de Pestañas de Operación y Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        {/* Selector tipo Tabs para Operación */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-background/80 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setSelectedOperation("")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              selectedOperation === ""
                ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20"
                : "text-muted hover:text-foreground hover:bg-surface/50"
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setSelectedOperation("For Sale")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              selectedOperation === "For Sale"
                ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20"
                : "text-muted hover:text-foreground hover:bg-surface/50"
            }`}
          >
            {operationLabel("For Sale")}
          </button>
          <button
            type="button"
            onClick={() => setSelectedOperation("For Rent")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              selectedOperation === "For Rent"
                ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20"
                : "text-muted hover:text-foreground hover:bg-surface/50"
            }`}
          >
            {operationLabel("For Rent")}
          </button>
        </div>

        {/* Botón de limpiar filtros */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-accent transition-colors duration-200 px-2 py-1 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      {/* Grilla principal de campos de filtro */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
        {/* Tipo de Propiedad */}
        <div className="flex flex-col gap-1.5 lg:col-span-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted/90 px-1">Tipo de Propiedad</label>
          <div className="relative flex items-center rounded-xl border border-border/80 bg-background/50 transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-3.5 text-muted/80"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <select
              name="tipo"
              defaultValue={defaults.tipo ?? ""}
              className="w-full cursor-pointer appearance-none bg-transparent py-3 pl-10 pr-9 text-sm font-medium text-foreground outline-none"
            >
              <option value="" className="bg-surface text-foreground">Cualquier tipo</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type} className="bg-surface text-foreground">
                  {type}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="pointer-events-none absolute right-3.5 text-muted/70"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Ubicación / Ciudad */}
        <div className="flex flex-col gap-1.5 lg:col-span-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted/90 px-1">Ubicación</label>
          <div className="relative flex items-center rounded-xl border border-border/80 bg-background/50 transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-3.5 text-muted/80"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <select
              name="ciudad"
              defaultValue={defaults.ciudad ?? ""}
              className="w-full cursor-pointer appearance-none bg-transparent py-3 pl-10 pr-9 text-sm font-medium text-foreground outline-none"
            >
              <option value="" className="bg-surface text-foreground">Todas las ciudades</option>
              {cities.map((city) => (
                <option key={city} value={city} className="bg-surface text-foreground">
                  {city}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="pointer-events-none absolute right-3.5 text-muted/70"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Rango de Precio (Min y Max juntos) */}
        <div className="flex flex-col gap-1.5 lg:col-span-4">
          <label className="text-xs font-bold uppercase tracking-wider text-muted/90 px-1">Rango de Precio</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex items-center rounded-xl border border-border/80 bg-background/50 transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
              <span className="pointer-events-none absolute left-3.5 text-xs font-semibold text-muted/80">$</span>
              <input
                type="number"
                name="precioMin"
                placeholder="Mínimo"
                defaultValue={defaults.precioMin ?? ""}
                className="w-full bg-transparent py-3 pl-7 pr-3 text-sm font-medium text-foreground placeholder:text-muted/60 outline-none"
              />
            </div>
            <div className="relative flex items-center rounded-xl border border-border/80 bg-background/50 transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
              <span className="pointer-events-none absolute left-3.5 text-xs font-semibold text-muted/80">$</span>
              <input
                type="number"
                name="precioMax"
                placeholder="Máximo"
                defaultValue={defaults.precioMax ?? ""}
                className="w-full bg-transparent py-3 pl-7 pr-3 text-sm font-medium text-foreground placeholder:text-muted/60 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dormitorios — el feed llama "rooms" a este dato, pero es la
            cantidad de dormitorios, no de ambientes (ver comentario en
            FilterBarProps.defaults.dormitorios). */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted/90 px-1">Dormitorios</label>
          <div className="relative flex items-center rounded-xl border border-border/80 bg-background/50 transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-3.5 text-muted/80"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            <input
              type="number"
              name="dormitorios"
              placeholder="Mínimo"
              defaultValue={defaults.dormitorios ?? ""}
              className="w-full bg-transparent py-3 pl-10 pr-3 text-sm font-medium text-foreground placeholder:text-muted/60 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Barra Inferior: Apto Crédito Toggle Pill + Botón Buscar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-border/40">
        {/* Toggle Pill Apto Crédito */}
        <button
          type="button"
          onClick={() => setIsAptoCredito(!isAptoCredito)}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer border ${
            isAptoCredito
              ? "border-accent/40 bg-accent-soft text-accent shadow-sm"
              : "border-border/80 bg-background/60 text-muted hover:border-border hover:text-foreground"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isAptoCredito ? "text-accent" : "text-muted/80"}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          <span>Solo Apto Crédito</span>
          {isAptoCredito && (
            <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
          )}
        </button>

        {/* Botón Buscar */}
        <button
          type="submit"
          className="group relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-strong px-7 py-3 text-sm font-semibold text-accent-foreground shadow-md shadow-accent/20 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-accent/25 active:scale-[0.99] cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="transition-transform duration-300 group-hover:scale-110"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.3-4.3" />
          </svg>
          <span>Buscar Propiedades</span>
        </button>
      </div>
    </form>
  );
}

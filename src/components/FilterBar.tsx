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
    dormitorios?: string;
    aptoCredito?: string;
  };
}

export function FilterBar({ action, cities, propertyTypes, defaults }: FilterBarProps) {
  const [selectedOperation, setSelectedOperation] = useState<string>(defaults.operacion ?? "");
  const [isAptoCredito, setIsAptoCredito] = useState<boolean>(defaults.aptoCredito === "true");

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
    window.location.href = action;
  };

  return (
    <form
      method="get"
      action={action}
      className="group relative flex flex-col gap-6 sm:gap-7 rounded-[2.25rem] border border-border/80 bg-surface/95 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:border-accent/30"
    >
      <input type="hidden" name="operacion" value={selectedOperation} />
      {isAptoCredito && <input type="hidden" name="aptoCredito" value="true" />}

      {/* Cabecera de Pestañas de Operación y Reset */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
        {/* Selector de Pestañas de Operación */}
        <div className="inline-flex items-center gap-1.5 rounded-2xl bg-background/90 p-1.5 border border-border/70 shadow-inner">
          <button
            type="button"
            onClick={() => setSelectedOperation("")}
            className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              selectedOperation === ""
                ? "bg-accent text-accent-foreground shadow-md shadow-accent/25 scale-[1.02]"
                : "text-muted hover:text-foreground hover:bg-surface/60"
            }`}
          >
            Todas las propiedades
          </button>
          <button
            type="button"
            onClick={() => setSelectedOperation("For Sale")}
            className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              selectedOperation === "For Sale"
                ? "bg-accent text-accent-foreground shadow-md shadow-accent/25 scale-[1.02]"
                : "text-muted hover:text-foreground hover:bg-surface/60"
            }`}
          >
            {operationLabel("For Sale")}
          </button>
          <button
            type="button"
            onClick={() => setSelectedOperation("For Rent")}
            className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer ${
              selectedOperation === "For Rent"
                ? "bg-accent text-accent-foreground shadow-md shadow-accent/25 scale-[1.02]"
                : "text-muted hover:text-foreground hover:bg-surface/60"
            }`}
          >
            {operationLabel("For Rent")}
          </button>
        </div>

        {/* Botón de Limpiar Filtros */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors duration-200 px-3 py-1.5 rounded-xl border border-border/50 bg-background/50 hover:bg-surface cursor-pointer"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
            </svg>
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      {/* Grilla Principal de Filtros (Campos de 56px de alto) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12 items-end">
        {/* Tipo de Propiedad */}
        <div className="flex flex-col gap-2 lg:col-span-3">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted/90 px-1 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Tipo de Propiedad
          </label>
          <div className="relative flex h-14 items-center rounded-2xl border border-border/80 bg-background/70 shadow-xs transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
            <select
              name="tipo"
              defaultValue={defaults.tipo ?? ""}
              className="w-full h-full cursor-pointer appearance-none bg-transparent px-4 pr-10 text-sm sm:text-base font-semibold text-foreground outline-none"
            >
              <option value="" className="bg-surface text-foreground font-medium">Cualquier tipo</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type} className="bg-surface text-foreground font-medium">
                  {type}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="pointer-events-none absolute right-4 text-muted/70"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Ubicación / Ciudad */}
        <div className="flex flex-col gap-2 lg:col-span-3">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted/90 px-1 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            Ubicación
          </label>
          <div className="relative flex h-14 items-center rounded-2xl border border-border/80 bg-background/70 shadow-xs transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
            <select
              name="ciudad"
              defaultValue={defaults.ciudad ?? ""}
              className="w-full h-full cursor-pointer appearance-none bg-transparent px-4 pr-10 text-sm sm:text-base font-semibold text-foreground outline-none"
            >
              <option value="" className="bg-surface text-foreground font-medium">Todas las ciudades</option>
              {cities.map((city) => (
                <option key={city} value={city} className="bg-surface text-foreground font-medium">
                  {city}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="pointer-events-none absolute right-4 text-muted/70"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Rango de Precio ($ Min - Max) */}
        <div className="flex flex-col gap-2 lg:col-span-4">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted/90 px-1 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-9h6a1.5 1.5 0 0 1 0 3H9m0 0h6a1.5 1.5 0 0 1 0 3H9" />
            </svg>
            Rango de Precio
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative flex h-14 items-center rounded-2xl border border-border/80 bg-background/70 shadow-xs transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
              <span className="pointer-events-none absolute left-3.5 text-xs font-bold text-muted">$</span>
              <input
                type="number"
                name="precioMin"
                placeholder="Mínimo"
                defaultValue={defaults.precioMin ?? ""}
                className="w-full h-full bg-transparent pl-8 pr-3 text-sm sm:text-base font-semibold text-foreground placeholder:text-muted/60 outline-none"
              />
            </div>
            <div className="relative flex h-14 items-center rounded-2xl border border-border/80 bg-background/70 shadow-xs transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
              <span className="pointer-events-none absolute left-3.5 text-xs font-bold text-muted">$</span>
              <input
                type="number"
                name="precioMax"
                placeholder="Máximo"
                defaultValue={defaults.precioMax ?? ""}
                className="w-full h-full bg-transparent pl-8 pr-3 text-sm sm:text-base font-semibold text-foreground placeholder:text-muted/60 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dormitorios */}
        <div className="flex flex-col gap-2 lg:col-span-2">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted/90 px-1 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            Dorm.
          </label>
          <div className="relative flex h-14 items-center rounded-2xl border border-border/80 bg-background/70 shadow-xs transition-all duration-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft hover:border-border">
            <input
              type="number"
              name="dormitorios"
              placeholder="Mínimo"
              defaultValue={defaults.dormitorios ?? ""}
              className="w-full h-full bg-transparent px-4 text-sm sm:text-base font-semibold text-foreground placeholder:text-muted/60 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Barra Inferior: Apto Crédito Toggle Pill + Botón Buscar Destacado */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-border/50">
        {/* Toggle Pill Apto Crédito */}
        <button
          type="button"
          onClick={() => setIsAptoCredito(!isAptoCredito)}
          className={`flex items-center justify-center gap-2.5 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer border ${
            isAptoCredito
              ? "border-accent/50 bg-accent-soft text-accent shadow-sm shadow-accent/20"
              : "border-border/80 bg-background/70 text-muted hover:border-border hover:text-foreground"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isAptoCredito ? "text-accent" : "text-muted/80"}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          <span>Apto Crédito</span>
          {isAptoCredito && (
            <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
          )}
        </button>

        {/* Botón Buscar Propiedades VISUALMENTE FUERTE */}
        <button
          type="submit"
          className="group relative flex h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-accent via-amber-500 to-accent-strong px-9 text-base font-extrabold tracking-wide text-accent-foreground shadow-xl shadow-accent/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent/40 active:scale-[0.99] cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            className="transition-transform duration-300 group-hover:scale-110"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.3-4.3" />
          </svg>
          <span>Buscar Propiedades</span>
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </form>
  );
}

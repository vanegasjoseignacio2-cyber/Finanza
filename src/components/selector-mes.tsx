"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { mesActual, nombreMes, sumarMeses } from "@/lib/fechas";

export function SelectorMes({
  mes,
  onCambio,
  cargando = false,
}: {
  mes: string;
  onCambio: (mes: string) => void;
  cargando?: boolean;
}) {
  const hoy = mesActual();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onCambio(sumarMeses(mes, -1))}
        aria-label="Mes anterior"
        className="grid size-11 cursor-pointer place-items-center rounded-xl border border-borde-suave text-tinta-2 transition-colors hover:border-verde/40 hover:text-tinta"
      >
        <ChevronLeft className="size-4.5" aria-hidden="true" />
      </button>

      <span
        aria-live="polite"
        className={`min-w-[10.5rem] text-center text-[14.5px] font-medium capitalize transition-opacity ${
          cargando ? "text-tinta-3 opacity-70" : "text-tinta"
        }`}
      >
        {nombreMes(mes)}
      </span>

      <button
        type="button"
        onClick={() => onCambio(sumarMeses(mes, 1))}
        aria-label="Mes siguiente"
        className="grid size-11 cursor-pointer place-items-center rounded-xl border border-borde-suave text-tinta-2 transition-colors hover:border-verde/40 hover:text-tinta"
      >
        <ChevronRight className="size-4.5" aria-hidden="true" />
      </button>

      {mes !== hoy && (
        <button
          type="button"
          onClick={() => onCambio(hoy)}
          className="ml-1 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[13px] text-tinta-3 transition-colors hover:text-verde"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Mes actual
        </button>
      )}
    </div>
  );
}

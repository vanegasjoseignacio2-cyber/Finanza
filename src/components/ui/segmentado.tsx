"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";

export interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
  /**
   * Icono sobre la etiqueta. Si las opciones lo traen, el selector se dibuja
   * compacto: todas en una sola fila, aunque sean cinco en un celular.
   */
  icono?: LucideIcon;
}

/** Selector de una opción entre pocas, con indicador que se desliza. */
export function Segmentado<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambio,
  columnas = "grid-cols-3",
  ocultarEtiqueta = false,
}: {
  etiqueta: string;
  opciones: Opcion<T>[];
  valor: T;
  onCambio: (valor: T) => void;
  /** Columnas de la cuadrícula (clase de Tailwind). Con iconos se ignora: son tantas como opciones. */
  columnas?: string;
  /** Deja la etiqueta solo para lectores de pantalla (el grupo conserva su nombre). */
  ocultarEtiqueta?: boolean;
}) {
  const id = useId();
  const conIconos = opciones.some((o) => o.icono);
  return (
    <div>
      <span className={ocultarEtiqueta ? "sr-only" : "mb-1.5 block text-[13px] font-medium text-tinta-2"}>{etiqueta}</span>
      <div
        role="radiogroup"
        aria-label={etiqueta}
        className={`grid rounded-xl border border-borde-suave bg-fondo-alto p-1 ${conIconos ? "gap-0.5" : `gap-1 ${columnas}`}`}
        style={conIconos ? { gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` } : undefined}
      >
        {opciones.map((opcion) => {
          const activo = opcion.valor === valor;
          const Icono = opcion.icono;
          return (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onCambio(opcion.valor)}
              className={`relative cursor-pointer rounded-lg font-medium transition-colors ${
                conIconos
                  ? "flex min-h-[3.25rem] flex-col items-center justify-center gap-1 px-0.5 text-[11.5px] leading-none tracking-tight whitespace-nowrap sm:text-[12.5px]"
                  : "min-h-11 px-2 text-[13px]"
              } ${activo ? "text-[#04121c]" : "text-tinta-3 hover:text-tinta-2"}`}
            >
              {activo && (
                <motion.span
                  layoutId={`segmento-${id}`}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-acento"
                />
              )}
              {Icono && <Icono className="relative size-[18px] shrink-0" aria-hidden="true" />}
              <span className="relative">{opcion.etiqueta}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

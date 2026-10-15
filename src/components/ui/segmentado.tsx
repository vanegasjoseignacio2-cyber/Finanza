"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

// Fondo de la opción elegida: blanco que baja a un gris medio hacia la esquina inferior derecha.
const FONDO_ACTIVO = "bg-[linear-gradient(135deg,#ffffff_0%,#9ca3af_100%)]";

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
  maxPorFila,
}: {
  etiqueta: string;
  opciones: Opcion<T>[];
  valor: T;
  onCambio: (valor: T) => void;
  /** Columnas de la cuadrícula (clase de Tailwind). Con iconos se ignora: son tantas como opciones. */
  columnas?: string;
  /** Deja la etiqueta solo para lectores de pantalla (el grupo conserva su nombre). */
  ocultarEtiqueta?: boolean;
  /**
   * Solo con iconos: tope de opciones por fila. Si hay más, se reparten en filas
   * parejas (5 → 3 + 2) en vez de apretarlas hasta cortar los nombres.
   */
  maxPorFila?: number;
}) {
  const conIconos = opciones.some((o) => o.icono);
  const columnasConIconos =
    maxPorFila && opciones.length > maxPorFila
      ? Math.ceil(opciones.length / Math.ceil(opciones.length / maxPorFila))
      : opciones.length;
  return (
    <div>
      <span className={ocultarEtiqueta ? "sr-only" : "mb-1.5 block text-[13px] font-medium text-tinta-2"}>{etiqueta}</span>
      <div
        role="radiogroup"
        aria-label={etiqueta}
        className={`grid rounded-xl border border-borde-suave bg-fondo-alto p-1 ${conIconos ? "gap-0.5" : `gap-1 ${columnas}`}`}
        style={conIconos ? { gridTemplateColumns: `repeat(${columnasConIconos}, minmax(0, 1fr))` } : undefined}
      >
        {opciones.map((opcion) => {
          const activo = opcion.valor === valor;
          const Icono = opcion.icono;
          return (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              title={conIconos ? opcion.etiqueta : undefined}
              aria-checked={activo}
              onClick={() => onCambio(opcion.valor)}
              className={`relative cursor-pointer rounded-lg font-medium transition-colors ${
                conIconos
                  ? "flex min-h-[3.25rem] min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11.5px] leading-none tracking-tight whitespace-nowrap sm:text-[12.5px]"
                  : "min-h-11 px-1 text-[13px] whitespace-nowrap"
              } ${activo ? "text-[#04121c]" : "text-tinta-3 hover:text-tinta-2"}`}
            >
              {/* El fondo se rellena desde el centro hacia las esquinas. */}
              <AnimatePresence initial={false}>
                {activo && (
                  <motion.span
                    key="fondo"
                    initial={{ clipPath: "circle(0% at 50% 50%)" }}
                    animate={{ clipPath: "circle(75% at 50% 50%)" }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute inset-0 rounded-lg ${FONDO_ACTIVO}`}
                  />
                )}
              </AnimatePresence>
              {Icono && <Icono className="relative size-[18px] shrink-0" aria-hidden="true" />}
              <span className={conIconos ? "relative max-w-full truncate" : "relative"}>{opcion.etiqueta}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

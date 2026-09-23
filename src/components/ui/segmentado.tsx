"use client";

import { motion } from "framer-motion";
import { useId } from "react";

export interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

/** Selector de una opción entre pocas, con indicador que se desliza. */
export function Segmentado<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambio,
  columnas = "grid-cols-3",
}: {
  etiqueta: string;
  opciones: Opcion<T>[];
  valor: T;
  onCambio: (valor: T) => void;
  columnas?: string;
}) {
  const id = useId();
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium text-tinta-2">{etiqueta}</span>
      <div
        role="radiogroup"
        aria-label={etiqueta}
        className={`grid gap-1 rounded-xl border border-borde-suave bg-fondo-alto p-1 ${columnas}`}
      >
        {opciones.map((opcion) => {
          const activo = opcion.valor === valor;
          return (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onCambio(opcion.valor)}
              className={`relative min-h-11 cursor-pointer rounded-lg px-2 text-[13px] font-medium transition-colors ${
                activo ? "text-[#04121c]" : "text-tinta-3 hover:text-tinta-2"
              }`}
            >
              {activo && (
                <motion.span
                  layoutId={`segmento-${id}`}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-verde"
                />
              )}
              <span className="relative">{opcion.etiqueta}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

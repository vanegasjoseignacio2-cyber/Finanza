"use client";

import { motion, useReducedMotion } from "framer-motion";

const COLOR = {
  normal: "bg-verde",
  cerca: "bg-aviso",
  excedido: "bg-alerta",
  neutro: "bg-azul-hondo",
} as const;

/**
 * Barra de progreso de un solo tono. El color cambia solo cuando cambia el
 * estado (cerca del tope, excedido), y siempre va acompañado de texto.
 */
export function Barra({
  porcentaje,
  estado = "normal",
  etiqueta,
  alto = "h-2",
}: {
  porcentaje: number;
  estado?: keyof typeof COLOR;
  etiqueta: string;
  alto?: string;
}) {
  const sinMovimiento = useReducedMotion();
  const ancho = Math.max(0, Math.min(100, porcentaje));
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ancho)}
      className={`w-full overflow-hidden rounded-full bg-borde-suave ${alto}`}
    >
      <motion.div
        className={`h-full rounded-full ${COLOR[estado]}`}
        initial={{ width: 0 }}
        animate={{ width: `${ancho}%` }}
        transition={sinMovimiento ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

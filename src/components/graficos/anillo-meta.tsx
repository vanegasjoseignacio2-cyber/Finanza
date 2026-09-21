"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { MARCA_FIN, MARCA_INICIO, MARCA_MEDIO } from "@/lib/paleta";
import { pesos } from "@/lib/dinero";

const RADIO = 84;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export function AnilloMeta({
  progreso,
  ahorrado,
  meta,
}: {
  progreso: number;
  ahorrado: number;
  meta: number;
}) {
  const id = useId();
  const sinMovimiento = useReducedMotion();
  const fraccion = Math.max(0, Math.min(100, progreso)) / 100;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <svg
        viewBox="0 0 200 200"
        className="size-full -rotate-90"
        role="img"
        aria-label={`Progreso de la meta: ${progreso}%. Llevas ${pesos(ahorrado)} de ${pesos(meta)}.`}
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={MARCA_INICIO} />
            <stop offset="55%" stopColor={MARCA_MEDIO} />
            <stop offset="100%" stopColor={MARCA_FIN} />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={RADIO}
          fill="none"
          stroke="var(--color-borde-suave)"
          strokeWidth="14"
        />
        <motion.circle
          cx="100"
          cy="100"
          r={RADIO}
          fill="none"
          stroke={`url(#grad-${id})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          initial={{ strokeDashoffset: CIRCUNFERENCIA }}
          animate={{ strokeDashoffset: CIRCUNFERENCIA * (1 - fraccion) }}
          transition={
            sinMovimiento
              ? { duration: 0 }
              : { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }
          }
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-4xl font-semibold tabular text-tinta">
          {progreso}
          <span className="text-2xl text-tinta-2">%</span>
        </span>
        <span className="mt-1 max-w-[9rem] text-[12px] leading-tight text-tinta-3">
          de la meta cubierta
        </span>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Tarjeta({
  id,
  titulo,
  accion,
  children,
  className = "",
  retraso = 0,
}: {
  id?: string;
  titulo?: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  retraso?: number;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: retraso, ease: [0.22, 1, 0.36, 1] }}
      className={`tarjeta p-5 sm:p-6 ${className}`}
    >
      {(titulo || accion) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {titulo && (
            <h2 className="text-[12px] font-semibold tracking-[0.12em] text-tinta-3 uppercase">
              {titulo}
            </h2>
          )}
          {accion}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export function Vacio({ mensaje, children }: { mensaje: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-borde-suave px-4 py-8 text-center">
      <p className="max-w-xs text-[13.5px] leading-relaxed text-tinta-3">{mensaje}</p>
      {children}
    </div>
  );
}

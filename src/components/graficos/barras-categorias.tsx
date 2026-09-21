"use client";

import { motion, useReducedMotion } from "framer-motion";
import { IconoCategoria } from "@/components/iconos";
import { etiquetaCategoria } from "@/lib/categorias";
import { pesos } from "@/lib/dinero";
import type { ResumenCategoria } from "@/lib/types";

/**
 * Barras horizontales ordenadas por monto. Todas comparten el mismo relleno:
 * la magnitud la comunica el largo y la identidad la etiqueta, nunca el color.
 */
export function BarrasCategorias({ categorias }: { categorias: ResumenCategoria[] }) {
  const sinMovimiento = useReducedMotion();
  const mayor = categorias[0]?.total ?? 1;

  return (
    <ul className="flex flex-col gap-3.5">
      {categorias.map((c, indice) => {
        const ancho = Math.max(3, Math.round((c.total / mayor) * 100));
        return (
          <li key={c.categoria} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
            <div className="flex min-w-0 items-center gap-2 text-[13.5px] text-tinta-2">
              <IconoCategoria id={c.categoria} className="size-4 shrink-0 text-tinta-3" />
              <span className="truncate">{etiquetaCategoria(c.categoria)}</span>
            </div>
            <div className="flex items-baseline gap-2 text-right">
              <span className="text-[14px] font-semibold tabular text-tinta">
                {pesos(c.total)}
              </span>
              <span className="w-9 text-[12px] tabular text-tinta-3">{c.porcentaje}%</span>
            </div>
            <div className="col-span-2 h-2 overflow-hidden rounded-full bg-borde-suave">
              <motion.div
                className="h-full rounded-full degradado-marca"
                initial={{ width: 0 }}
                animate={{ width: `${ancho}%` }}
                transition={
                  sinMovimiento
                    ? { duration: 0 }
                    : { duration: 0.7, delay: 0.05 * indice, ease: [0.22, 1, 0.36, 1] }
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

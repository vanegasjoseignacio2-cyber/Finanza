"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { pesos } from "@/lib/dinero";

type Tono = "neutro" | "verde" | "azul" | "alerta";

const TONOS: Record<Tono, { icono: string; valor: string }> = {
  neutro: { icono: "bg-superficie-alta text-tinta-2", valor: "text-tinta" },
  verde: { icono: "bg-verde/12 text-verde", valor: "text-verde" },
  azul: { icono: "bg-azul/12 text-azul", valor: "text-tinta" },
  alerta: { icono: "bg-alerta/12 text-alerta", valor: "text-alerta" },
};

export function TarjetaKPI({
  etiqueta,
  valor,
  detalle,
  Icono,
  tono = "neutro",
  retraso = 0,
}: {
  etiqueta: string;
  valor: number;
  detalle?: string;
  Icono: LucideIcon;
  tono?: Tono;
  retraso?: number;
}) {
  const estilo = TONOS[tono];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: retraso, ease: [0.22, 1, 0.36, 1] }}
      className="tarjeta flex flex-col gap-3 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium tracking-wide text-tinta-3">{etiqueta}</span>
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${estilo.icono}`}>
          <Icono className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div>
        <p className={`font-display text-[clamp(1.25rem,4.2vw,1.6rem)] leading-tight font-semibold tabular ${estilo.valor}`}>
          {pesos(valor)}
        </p>
        {detalle && <p className="mt-1 text-[12px] leading-relaxed text-tinta-3">{detalle}</p>}
      </div>
    </motion.div>
  );
}

"use client";

import * as TooltipPrimitivo from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useState } from "react";

/** Envuelve el árbol de la app una sola vez, arriba de todo. */
export function ProveedorTooltip({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitivo.Provider delayDuration={350} skipDelayDuration={100}>
      {children}
    </TooltipPrimitivo.Provider>
  );
}

/**
 * Tooltip accesible: aparece al enfocar con teclado o al dejar el puntero
 * quieto, nunca reemplaza el aria-label (los lectores de pantalla ya lo leen
 * sin esto). Úsalo en botones de solo icono para explicar qué hacen.
 */
export function Tooltip({
  texto,
  children,
  lado = "top",
}: {
  texto: string;
  children: ReactNode;
  lado?: "top" | "right" | "bottom" | "left";
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <TooltipPrimitivo.Root open={abierto} onOpenChange={setAbierto}>
      <TooltipPrimitivo.Trigger asChild>{children}</TooltipPrimitivo.Trigger>
      <AnimatePresence>
        {abierto && (
          <TooltipPrimitivo.Portal forceMount>
            <TooltipPrimitivo.Content
              side={lado}
              sideOffset={8}
              className="z-50"
              asChild
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: lado === "top" ? 4 : lado === "bottom" ? -4 : 0 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="rounded-lg border border-borde bg-superficie-alta px-2.5 py-1.5 text-[12.5px] font-medium text-tinta shadow-xl"
              >
                {texto}
                <TooltipPrimitivo.Arrow className="fill-superficie-alta" width={10} height={5} />
              </motion.div>
            </TooltipPrimitivo.Content>
          </TooltipPrimitivo.Portal>
        )}
      </AnimatePresence>
    </TooltipPrimitivo.Root>
  );
}

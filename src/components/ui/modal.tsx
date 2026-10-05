"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { bloquearScroll } from "./bloqueo-scroll";
import { Tooltip } from "./tooltip";

interface Props {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: ReactNode;
}

// Modales abiertos, del más viejo al más nuevo: con uno encima de otro (una
// confirmación sobre un formulario), Escape y Tab solo los atiende el de arriba.
const pila: object[] = [];

export function Modal({ abierto, titulo, descripcion, onCerrar, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  // Aparte del resto: solo depende de si está abierto, no de `onCerrar`, que cambia
  // en cada render del padre y haría soltar y volver a fijar la página cada vez.
  useEffect(() => {
    if (!abierto) return;
    return bloquearScroll();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;

    const yo = {};
    pila.push(yo);

    const alPulsar = (e: KeyboardEvent) => {
      if (pila.at(-1) !== yo) return;
      if (e.key === "Escape") onCerrar();
      if (e.key !== "Tab" || !panel.current) return;
      // Mantiene el foco dentro del diálogo mientras está abierto.
      const focuseables = panel.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (focuseables.length === 0) return;
      const primero = focuseables[0];
      const ultimo = focuseables[focuseables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    const anterior = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", alPulsar);
    const t = window.setTimeout(() => {
      panel.current
        ?.querySelector<HTMLElement>("input,select,textarea,button")
        ?.focus();
    }, 60);

    return () => {
      pila.splice(pila.indexOf(yo), 1);
      document.removeEventListener("keydown", alPulsar);
      window.clearTimeout(t);
      anterior?.focus?.();
    };
  }, [abierto, onCerrar]);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            tabIndex={-1}
            onClick={onCerrar}
            className="absolute inset-0 cursor-default touch-none bg-[#02060d]/75 backdrop-blur-sm"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl border border-borde-suave bg-superficie/95 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6 sm:pb-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4 sm:mb-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-tinta">{titulo}</h2>
                {descripcion && (
                  <p className="mt-1 text-[13.5px] leading-relaxed text-tinta-3">{descripcion}</p>
                )}
              </div>
              <Tooltip texto="Cerrar">
                <button
                  type="button"
                  onClick={onCerrar}
                  aria-label="Cerrar"
                  className="group -mt-1 -mr-1 grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-tinta-3 transition-[background-color,color,transform] duration-200 hover:bg-superficie-alta hover:text-tinta active:scale-90"
                >
                  {/* Al pasar el puntero la X gira un cuarto de vuelta y crece un poco. */}
                  <X
                    className="size-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-90"
                    aria-hidden="true"
                  />
                </button>
              </Tooltip>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { pesos } from "@/lib/dinero";

/**
 * Cifra en pesos que se desliza hasta su valor cuando cambia. El texto final
 * siempre es el exacto; sin movimiento reducido, aparece directamente.
 */
export function Cifra({ valor, className = "" }: { valor: number; className?: string }) {
  const nodo = useRef<HTMLSpanElement>(null);
  const anterior = useRef(0);
  const sinMovimiento = useReducedMotion();

  useEffect(() => {
    const el = nodo.current;
    if (!el) return;
    if (sinMovimiento) {
      el.textContent = pesos(valor);
      anterior.current = valor;
      return;
    }
    const control = animate(anterior.current, valor, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = pesos(v);
      },
    });
    anterior.current = valor;
    return () => control.stop();
  }, [valor, sinMovimiento]);

  return (
    <span ref={nodo} className={`tabular ${className}`}>
      {pesos(valor)}
    </span>
  );
}

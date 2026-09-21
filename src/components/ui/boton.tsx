"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";
type Tamano = "md" | "sm";

const VARIANTES: Record<Variante, string> = {
  primario:
    "degradado-marca text-[#04121c] font-semibold shadow-[0_8px_24px_-12px_rgba(52,211,153,0.8)] hover:brightness-110",
  secundario:
    "bg-superficie-alta/70 text-tinta border border-borde hover:border-verde/50 hover:text-white",
  fantasma: "text-tinta-2 hover:text-tinta hover:bg-superficie-alta/60",
  peligro:
    "bg-alerta/10 text-alerta border border-alerta/30 hover:bg-alerta/20 hover:text-alerta",
};

const TAMANOS: Record<Tamano, string> = {
  md: "min-h-11 px-4 text-sm",
  // El tamaño pequeño se ve de 36px pero se toca como uno de 44px.
  sm: "area-toque min-h-9 px-3 text-[13px]",
};

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45";

function clases(variante: Variante, tamano: Tamano, ancho: boolean, extra: string): string {
  return `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]} ${ancho ? "w-full" : ""} ${extra}`;
}

interface Comunes {
  variante?: Variante;
  tamano?: Tamano;
  ancho?: boolean;
  className?: string;
  children: ReactNode;
}

interface PropsBoton extends Omit<HTMLMotionProps<"button">, "children">, Comunes {
  cargando?: boolean;
}

export function Boton({
  variante = "primario",
  tamano = "md",
  cargando = false,
  ancho = false,
  className = "",
  disabled,
  children,
  ...props
}: PropsBoton) {
  const inactivo = disabled || cargando;
  return (
    <motion.button
      whileTap={inactivo ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      disabled={inactivo}
      aria-busy={cargando || undefined}
      className={clases(variante, tamano, ancho, className)}
      {...props}
    >
      {cargando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  );
}

interface PropsEnlace extends Comunes {
  href: string;
  /** Descarga un archivo servido por la API en vez de navegar. */
  descarga?: boolean;
}

/**
 * Mismo aspecto que un botón, pero es un enlace de verdad. Evita anidar un
 * <button> dentro de un <a>, que es HTML inválido y duplica el foco.
 */
export function BotonEnlace({
  href,
  descarga = false,
  variante = "primario",
  tamano = "md",
  ancho = false,
  className = "",
  children,
}: PropsEnlace) {
  const estilo = clases(variante, tamano, ancho, className);

  if (descarga) {
    return (
      <a href={href} download className={estilo}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={estilo}>
      {children}
    </Link>
  );
}

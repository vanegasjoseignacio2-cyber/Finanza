"use client";

import { motion } from "framer-motion";
import { Home, PieChart, Plus, Receipt, Settings, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCaptura } from "@/components/captura";
import { Marca } from "@/components/marca";

const ENLACES = [
  { href: "/", etiqueta: "Hoy", Icono: Home },
  { href: "/movimientos", etiqueta: "Movimientos", Icono: Receipt },
  { href: "/presupuesto", etiqueta: "Presupuesto", Icono: PieChart },
  { href: "/metas", etiqueta: "Metas", Icono: Target },
] as const;

function esActivo(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BarraLateral() {
  const pathname = usePathname();
  const captura = useCaptura();
  const enlaces = [...ENLACES, { href: "/ajustes", etiqueta: "Ajustes", Icono: Settings }];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-borde-suave bg-fondo-alto px-4 py-6 lg:flex">
      <div className="px-2">
        <Marca />
      </div>

      <button
        type="button"
        onClick={() => captura.abrir()}
        className="degradado-marca mt-7 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-[#04121c] transition-[filter] hover:brightness-110"
      >
        <Plus className="size-4" aria-hidden="true" />
        Nuevo movimiento
      </button>

      <nav aria-label="Principal" className="mt-6 flex flex-col gap-1">
        {enlaces.map(({ href, etiqueta, Icono }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors ${
                activo ? "text-tinta" : "text-tinta-3 hover:bg-superficie hover:text-tinta-2"
              }`}
            >
              {activo && (
                <motion.span
                  layoutId="nav-activo"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-superficie-alta"
                />
              )}
              <Icono className={`size-4.5 shrink-0 ${activo ? "text-verde" : ""}`} aria-hidden="true" />
              {etiqueta}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function BarraSuperiorMovil() {
  const pathname = usePathname();
  const enAjustes = pathname.startsWith("/ajustes");
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-borde-suave bg-fondo/90 px-4 py-2.5 backdrop-blur-xl lg:hidden">
      <Link href="/" aria-label="Ir a Hoy" className="flex min-h-11 items-center">
        <Marca />
      </Link>
      <Link
        href="/ajustes"
        aria-current={enAjustes ? "page" : undefined}
        className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13.5px] transition-colors ${
          enAjustes ? "text-verde" : "text-tinta-3 hover:text-tinta"
        }`}
      >
        <Settings className="size-4.5" aria-hidden="true" />
        Ajustes
      </Link>
    </header>
  );
}

export function BarraInferiorMovil() {
  const pathname = usePathname();
  const captura = useCaptura();
  const [a, b, c, d] = ENLACES;

  const enlace = ({ href, etiqueta, Icono }: (typeof ENLACES)[number]) => {
    const activo = esActivo(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={activo ? "page" : undefined}
          className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors ${
            activo ? "text-verde" : "text-tinta-3"
          }`}
        >
          {activo && (
            <motion.span
              layoutId="nav-activo-movil"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-verde"
            />
          )}
          <Icono className="size-5" aria-hidden="true" />
          {etiqueta}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borde-suave bg-fondo/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5 items-center">
        {enlace(a)}
        {enlace(b)}
        <li className="flex justify-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => captura.abrir()}
            aria-label="Nuevo movimiento"
            className="degradado-marca -mt-5 grid size-14 cursor-pointer place-items-center rounded-2xl text-[#04121c] shadow-[0_10px_28px_-10px_rgba(52,211,153,0.9)]"
          >
            <Plus className="size-6" aria-hidden="true" />
          </motion.button>
        </li>
        {enlace(c)}
        {enlace(d)}
      </ul>
    </nav>
  );
}

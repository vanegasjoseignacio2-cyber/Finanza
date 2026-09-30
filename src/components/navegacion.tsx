"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronsLeft,
  Home,
  PieChart,
  Plus,
  Receipt,
  Settings,
  Target,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useCaptura } from "@/components/captura";
import { Marca } from "@/components/marca";
import { Tooltip } from "@/components/ui/tooltip";

const ENLACES = [
  { href: "/", etiqueta: "Hoy", Icono: Home },
  { href: "/movimientos", etiqueta: "Movimientos", Icono: Receipt },
  { href: "/presupuesto", etiqueta: "Presupuesto", Icono: PieChart },
  { href: "/metas", etiqueta: "Metas", Icono: Target },
] as const;

// Solo en el menú de escritorio: en el de abajo del móvil no cabe un quinto
// enlace junto al botón central de "Nuevo movimiento".
const ENLACE_CALENDARIO = { href: "/calendario", etiqueta: "Calendario", Icono: CalendarDays } as const;

function esActivo(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/* ─── Estado de colapso del menú de escritorio ───────────────────────────── */

const CLAVE_COLAPSADO = "finanza:menu-colapsado";
export const ANCHO_MENU = { abierto: "16rem", colapsado: "4.5rem" } as const;

const ContextoMenu = createContext<{ colapsado: boolean; alternar: () => void } | null>(null);

// El servidor no tiene localStorage, así que la primera pintura (SSR y el
// primer render del cliente, antes de hidratar) siempre asume "abierto" para
// que coincidan; useSyncExternalStore corrige al valor real justo después,
// sin el parpadeo ni el desajuste de hidratación que daba leer localStorage
// directo en el useState inicial.
function suscribir(avisar: () => void) {
  window.addEventListener("storage", avisar);
  return () => window.removeEventListener("storage", avisar);
}

function leerColapsado(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSADO) === "1";
  } catch {
    return false;
  }
}

function leerColapsadoServidor() {
  return false;
}

function guardarColapsado(colapsado: boolean) {
  try {
    localStorage.setItem(CLAVE_COLAPSADO, colapsado ? "1" : "0");
  } catch {
    /* sin almacenamiento: no pasa nada, solo no se recuerda */
  }
}

/**
 * Envuelve el panel entero: el layout (servidor) necesita saber si el menú
 * está colapsado para dejarle el espacio justo al contenido, y eso solo se
 * sabe en el cliente (localStorage).
 */
export function ProveedorMenu({ children }: { children: ReactNode }) {
  const colapsado = useSyncExternalStore(suscribir, leerColapsado, leerColapsadoServidor);

  // El evento "storage" no se dispara en la misma pestaña que escribió (solo
  // en las demás), así que se avisa a mano para que este componente lea el
  // nuevo valor de inmediato.
  const alternar = useCallback(() => {
    guardarColapsado(!leerColapsado());
    window.dispatchEvent(new StorageEvent("storage", { key: CLAVE_COLAPSADO }));
  }, []);

  const valor = useMemo(() => ({ colapsado, alternar }), [colapsado, alternar]);

  return <ContextoMenu.Provider value={valor}>{children}</ContextoMenu.Provider>;
}

function useMenu() {
  const valor = useContext(ContextoMenu);
  if (!valor) throw new Error("useMenu debe usarse dentro de <ProveedorMenu>.");
  return valor;
}

/** Deja en el contenido principal el espacio exacto del menú de escritorio. */
export function EspacioMenu({ children }: { children: ReactNode }) {
  const { colapsado } = useMenu();
  return (
    <div
      className="lg:pl-[var(--pl-lg)] lg:transition-[padding-left] lg:duration-300 lg:ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ ["--pl-lg" as string]: colapsado ? ANCHO_MENU.colapsado : ANCHO_MENU.abierto }}
    >
      {children}
    </div>
  );
}

/* ─── Menú de escritorio ──────────────────────────────────────────────────── */

export function BarraLateral() {
  const pathname = usePathname();
  const captura = useCaptura();
  const { colapsado, alternar } = useMenu();
  const enlaces = [...ENLACES, ENLACE_CALENDARIO, { href: "/ajustes", etiqueta: "Ajustes", Icono: Settings }];

  return (
    <motion.aside
      animate={{ width: colapsado ? ANCHO_MENU.colapsado : ANCHO_MENU.abierto }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-borde-suave bg-fondo-alto py-6 lg:flex"
    >
      <div className={`flex items-center ${colapsado ? "justify-center px-0" : "justify-between px-4"}`}>
        <div className="px-2">
          <Marca compacto={colapsado} />
        </div>
        {!colapsado && (
          <Tooltip texto="Colapsar menú" lado="right">
            <button
              type="button"
              onClick={alternar}
              aria-label="Colapsar menú"
              className="area-toque grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-tinta-2 transition-colors hover:bg-superficie hover:text-tinta"
            >
              <ChevronsLeft className="size-4.5" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className={`mt-7 ${colapsado ? "px-3" : "px-4"}`}>
        <Tooltip texto="Nuevo movimiento" lado="right">
          <button
            type="button"
            onClick={() => captura.abrir()}
            aria-label="Nuevo movimiento"
            className={`degradado-marca flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl text-[14px] font-semibold text-[#04121c] transition-[filter] hover:brightness-95 ${
              colapsado ? "justify-center px-0" : "justify-center"
            }`}
          >
            <Plus className="size-4 shrink-0" aria-hidden="true" />
            <AnimatePresence initial={false}>
              {!colapsado && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  Nuevo movimiento
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>
      </div>

      <nav aria-label="Principal" className={`mt-6 flex flex-col gap-1 ${colapsado ? "px-3" : "px-4"}`}>
        {enlaces.map(({ href, etiqueta, Icono }) => {
          const activo = esActivo(pathname, href);
          const enlace = (
            <Link
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl text-[14.5px] transition-colors ${
                colapsado ? "justify-center px-0" : "px-3"
              } ${activo ? "text-tinta" : "text-tinta-3 hover:bg-superficie hover:text-tinta-2"}`}
            >
              {activo && (
                <motion.span
                  layoutId="nav-activo"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-superficie-alta"
                />
              )}
              <Icono className={`size-4.5 shrink-0 ${activo ? "text-acento" : "text-tinta-2"}`} aria-hidden="true" />
              <AnimatePresence initial={false}>
                {!colapsado && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {etiqueta}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
          return (
            <div key={href}>
              {colapsado ? (
                <Tooltip texto={etiqueta} lado="right">
                  {enlace}
                </Tooltip>
              ) : (
                enlace
              )}
            </div>
          );
        })}
      </nav>

      <div className={`mt-auto ${colapsado ? "px-3" : "px-4"}`}>
        {colapsado ? (
          <Tooltip texto="Expandir menú" lado="right">
            <button
              type="button"
              onClick={alternar}
              aria-label="Expandir menú"
              className="area-toque grid min-h-11 w-full cursor-pointer place-items-center rounded-xl border border-borde-suave text-tinta-2 transition-colors hover:border-borde hover:bg-superficie hover:text-tinta"
            >
              <ChevronsLeft className="size-4.5 rotate-180" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </motion.aside>
  );
}

export function BarraSuperiorMovil() {
  const pathname = usePathname();
  const enAjustes = pathname.startsWith("/ajustes");
  const enCalendario = pathname.startsWith("/calendario");
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-borde-suave bg-fondo/90 px-4 py-2.5 backdrop-blur-xl lg:hidden">
      <Link href="/" aria-label="Ir a Hoy" className="flex min-h-11 items-center">
        <Marca />
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href="/calendario"
          aria-current={enCalendario ? "page" : undefined}
          aria-label="Calendario"
          className={`area-toque grid size-11 place-items-center rounded-xl transition-colors ${
            enCalendario ? "text-acento" : "text-tinta-3 hover:text-tinta"
          }`}
        >
          <CalendarDays className="size-4.5" aria-hidden="true" />
        </Link>
        <Link
          href="/ajustes"
          aria-current={enAjustes ? "page" : undefined}
          className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13.5px] transition-colors ${
            enAjustes ? "text-acento" : "text-tinta-3 hover:text-tinta"
          }`}
        >
          <Settings className="size-4.5" aria-hidden="true" />
          Ajustes
        </Link>
      </div>
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
            activo ? "text-acento" : "text-tinta-3"
          }`}
        >
          {activo && (
            <motion.span
              layoutId="nav-activo-movil"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-acento"
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
            className="degradado-marca -mt-5 grid size-14 cursor-pointer place-items-center rounded-2xl text-[#04121c] shadow-[0_10px_28px_-10px_rgba(255,255,255,0.35)]"
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

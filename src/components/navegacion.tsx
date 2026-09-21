"use client";

import { motion } from "framer-motion";
import { Bell, LayoutDashboard, LogOut, Receipt, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Marca } from "@/components/marca";
import { useAvisos } from "@/components/ui/avisos";

const ENLACES = [
  { href: "/", etiqueta: "Panel", Icono: LayoutDashboard },
  { href: "/movimientos", etiqueta: "Movimientos", Icono: Receipt },
  { href: "/recordatorios", etiqueta: "Recordatorios", Icono: Bell },
  { href: "/ajustes", etiqueta: "Ajustes", Icono: Settings },
] as const;

function esActivo(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function BotonSalir({ compacto = false }: { compacto?: boolean }) {
  const router = useRouter();
  const avisos = useAvisos();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      avisos.error("No pudimos cerrar la sesión. Intenta de nuevo.");
      setSaliendo(false);
    }
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={saliendo}
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[14px] text-tinta-3 transition-colors hover:bg-superficie-alta/70 hover:text-alerta disabled:opacity-50 ${compacto ? "" : "w-full"}`}
    >
      <LogOut className="size-4.5" aria-hidden="true" />
      Cerrar sesión
    </button>
  );
}

export function BarraLateral() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-borde-suave bg-fondo-alto/70 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Marca />
      </div>

      <nav aria-label="Principal" className="mt-8 flex flex-col gap-1">
        {ENLACES.map(({ href, etiqueta, Icono }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors ${
                activo ? "text-tinta" : "text-tinta-3 hover:bg-superficie-alta/60 hover:text-tinta-2"
              }`}
            >
              {activo && (
                <motion.span
                  layoutId="nav-activo"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-xl border border-verde/25 bg-superficie-alta"
                />
              )}
              <Icono
                className={`size-4.5 shrink-0 ${activo ? "text-verde" : ""}`}
                aria-hidden="true"
              />
              {etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-borde-suave pt-4">
        <BotonSalir />
      </div>
    </aside>
  );
}

export function BarraSuperiorMovil() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-borde-suave bg-fondo/85 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Marca />
      <BotonSalir compacto />
    </header>
  );
}

export function BarraInferiorMovil() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borde-suave bg-fondo/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {ENLACES.map(({ href, etiqueta, Icono }) => {
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
                    className="absolute inset-x-5 top-0 h-0.5 rounded-full degradado-marca"
                  />
                )}
                <Icono className="size-5" aria-hidden="true" />
                {etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

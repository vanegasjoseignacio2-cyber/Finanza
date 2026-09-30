"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tooltip } from "@/components/ui/tooltip";
import { mesActual, nombreMes, sumarMeses } from "@/lib/fechas";

/**
 * Navega de mes cambiando `?mes=` en la URL: cada mes tiene su enlace, se puede
 * compartir y el botón "atrás" del navegador funciona.
 */
export function SelectorMes({
  mes,
  ruta,
  otros = {},
}: {
  mes: string;
  ruta: string;
  otros?: Record<string, string>;
}) {
  const hoy = mesActual();
  const href = (m: string) => {
    const params = new URLSearchParams(otros);
    if (m === hoy) params.delete("mes");
    else params.set("mes", m);
    const q = params.toString();
    return q ? `${ruta}?${q}` : ruta;
  };
  const clase =
    "grid size-11 place-items-center rounded-xl border border-borde-suave text-tinta-2 transition-colors hover:border-tinta-3 hover:text-tinta";

  return (
    <div className="flex items-center gap-1">
      <Tooltip texto="Mes anterior">
        <Link href={href(sumarMeses(mes, -1))} aria-label="Mes anterior" className={clase} scroll={false}>
          <ChevronLeft className="size-4.5" aria-hidden="true" />
        </Link>
      </Tooltip>
      <span className="min-w-[10.5rem] text-center text-[14.5px] font-medium text-tinta capitalize" aria-live="polite">
        {nombreMes(mes)}
      </span>
      <Tooltip texto="Mes siguiente">
        <Link href={href(sumarMeses(mes, 1))} aria-label="Mes siguiente" className={clase} scroll={false}>
          <ChevronRight className="size-4.5" aria-hidden="true" />
        </Link>
      </Tooltip>
      {mes !== hoy && (
        <Link
          href={href(hoy)}
          scroll={false}
          className="ml-1 flex min-h-11 items-center rounded-xl px-3 text-[13px] text-tinta-3 transition-colors hover:text-tinta"
        >
          Mes actual
        </Link>
      )}
    </div>
  );
}

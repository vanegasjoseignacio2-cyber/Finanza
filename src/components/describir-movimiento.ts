"use client";

import { useDatos } from "@/components/datos-panel";
import type { Movimiento } from "@/lib/types";

export const COLOR_MOVIMIENTO: Record<Movimiento["tipo"], string> = {
  gasto: "text-tinta",
  ingreso: "text-verde",
  ahorro: "text-tinta-2",
  retiro: "text-tinta-2",
  transferencia: "text-tinta-2",
};

export const SIGNO_MOVIMIENTO: Record<Movimiento["tipo"], string> = {
  gasto: "− ",
  ingreso: "+ ",
  ahorro: "",
  retiro: "",
  transferencia: "",
};

export const NOMBRE_TIPO: Record<Movimiento["tipo"], string> = {
  gasto: "Gasto",
  ingreso: "Ingreso",
  ahorro: "Aporte a una meta",
  retiro: "Retiro de una meta",
  transferencia: "Transferencia",
};

/** Título e ícono con los que se muestra un movimiento en listas y en su detalle. */
export function useDescribir() {
  const { catalogo, cuentas, metas } = useDatos();
  const cuenta = (id: string | null) => cuentas.find((c) => c.id === id)?.nombre ?? "otra cuenta";
  const meta = (id: string | null) => metas.find((m) => m.id === id)?.nombre ?? "una meta";
  return (m: Movimiento) => {
    switch (m.tipo) {
      case "ahorro":
        return { titulo: `Aporte a ${meta(m.metaId)}`, icono: "PiggyBank" };
      case "retiro":
        return { titulo: `Retiro de ${meta(m.metaId)}`, icono: "ArrowDownToLine" };
      case "transferencia":
        return { titulo: `${cuenta(m.cuentaId)} → ${cuenta(m.cuentaDestinoId)}`, icono: "ArrowLeftRight" };
      default: {
        const c = catalogo.obtener(m.categoria);
        return { titulo: c.label, icono: c.icono };
      }
    }
  };
}

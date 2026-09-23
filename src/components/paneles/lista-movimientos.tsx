"use client";

import { Link2, Repeat } from "lucide-react";
import { useCaptura } from "@/components/captura";
import { useDatos } from "@/components/datos-panel";
import { Icono } from "@/components/iconos";
import { Vacio } from "@/components/ui/tarjeta";
import { pesos } from "@/lib/dinero";
import { DIAS_SEMANA, fechaCorta } from "@/lib/fechas";
import type { Movimiento } from "@/lib/types";

const COLOR: Record<Movimiento["tipo"], string> = {
  gasto: "text-tinta",
  ingreso: "text-verde",
  ahorro: "text-azul",
  retiro: "text-azul",
  transferencia: "text-tinta-2",
};

const SIGNO: Record<Movimiento["tipo"], string> = {
  gasto: "− ",
  ingreso: "+ ",
  ahorro: "",
  retiro: "",
  transferencia: "",
};

function useDescribir() {
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

function Fila({ m, conFecha }: { m: Movimiento; conFecha: boolean }) {
  const captura = useCaptura();
  const { cuentas } = useDatos();
  const describir = useDescribir();
  const d = describir(m);
  const variasCuentas = cuentas.filter((c) => !c.archivada).length > 1;
  const cuenta = cuentas.find((c) => c.id === m.cuentaId)?.nombre;
  const detalle = [
    conFecha ? fechaCorta(m.fecha) : null,
    variasCuentas && m.tipo !== "transferencia" ? cuenta : null,
    m.nota || null,
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-1 border-b border-borde-suave last:border-b-0">
      <button
        type="button"
        onClick={() => captura.editar(m)}
        aria-label={`Editar: ${d.titulo}, ${pesos(m.monto)}, ${fechaCorta(m.fecha)}`}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg py-3 pr-1 text-left transition-colors hover:bg-superficie-alta/40"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-superficie-alta text-tinta-2">
          <Icono nombre={d.icono} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[14.5px] text-tinta">
            <span className="truncate">{d.titulo}</span>
            {m.recurrenteId && (
              <span
                title="Pago fijo"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-superficie-alta px-1.5 py-0.5 text-[11px] text-tinta-2 sm:px-2"
              >
                <Link2 className="size-3" aria-hidden="true" />
                {/* En pantallas estrechas basta el ícono: el texto le robaba espacio al nombre. */}
                <span className="sr-only sm:not-sr-only">Pago fijo</span>
              </span>
            )}
          </span>
          {detalle.length > 0 && (
            <span className="block truncate text-[12.5px] text-tinta-3">{detalle.join(" · ")}</span>
          )}
        </span>
        <span className={`shrink-0 text-[14.5px] font-semibold tabular ${COLOR[m.tipo]}`}>
          {SIGNO[m.tipo]}
          {pesos(m.monto)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => captura.repetir(m)}
        aria-label={`Repetir ${d.titulo} con fecha de hoy`}
        className="area-toque grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-superficie-alta hover:text-verde"
      >
        <Repeat className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

/** Lista plana (para Hoy) o agrupada por día (para Movimientos). */
export function ListaMovimientos({
  movimientos,
  agrupar = false,
  mensajeVacio = "Todavía no hay movimientos.",
}: {
  movimientos: Movimiento[];
  agrupar?: boolean;
  mensajeVacio?: string;
}) {
  if (movimientos.length === 0) return <Vacio mensaje={mensajeVacio} />;

  if (!agrupar) {
    return (
      <ul className="flex flex-col">
        {movimientos.map((m) => (
          <Fila key={m.id} m={m} conFecha />
        ))}
      </ul>
    );
  }

  const dias = new Map<string, Movimiento[]>();
  for (const m of movimientos) dias.set(m.fecha, [...(dias.get(m.fecha) ?? []), m]);

  return (
    <div className="flex flex-col gap-5">
      {[...dias.entries()].map(([fecha, lista]) => {
        const gastoDia = lista.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.monto, 0);
        return (
          <section key={fecha} aria-label={fechaCorta(fecha)}>
            <header className="mb-1 flex items-baseline justify-between gap-3 border-b border-borde pb-1.5">
              <h3 className="text-[12.5px] font-semibold tracking-wide text-tinta-2 uppercase">
                {DIAS_SEMANA[new Date(`${fecha}T00:00:00Z`).getUTCDay()]} {fechaCorta(fecha)}
              </h3>
              {gastoDia > 0 && (
                <span className="text-[12.5px] tabular text-tinta-3">Gastado {pesos(gastoDia)}</span>
              )}
            </header>
            <ul className="flex flex-col">
              {lista.map((m) => (
                <Fila key={m.id} m={m} conFecha={false} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

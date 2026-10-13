"use client";

import { Pencil, Repeat } from "lucide-react";
import type { ReactNode } from "react";
import { useDatos } from "@/components/datos-panel";
import { COLOR_MOVIMIENTO, NOMBRE_TIPO, SIGNO_MOVIMIENTO, useDescribir } from "@/components/describir-movimiento";
import { Icono } from "@/components/iconos";
import { Boton } from "@/components/ui/boton";
import { Modal } from "@/components/ui/modal";
import { pesos } from "@/lib/dinero";
import { DIAS_SEMANA, fechaLarga } from "@/lib/fechas";
import type { Movimiento } from "@/lib/types";

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-borde-suave py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] text-tinta-3">{etiqueta}</dt>
      <dd className="min-w-0 text-right text-[14.5px] break-words text-tinta">{children}</dd>
    </div>
  );
}

/** Ficha de solo lectura de un movimiento, con salida a editarlo o repetirlo. */
export function DetalleMovimiento({
  movimiento,
  abierto,
  onCerrar,
  onEditar,
  onRepetir,
}: {
  movimiento: Movimiento | null;
  abierto: boolean;
  onCerrar: () => void;
  onEditar: () => void;
  onRepetir: () => void;
}) {
  const { cuentas, metas, pendientes } = useDatos();
  const describir = useDescribir();

  // Mientras el modal se cierra con animación el movimiento sigue ahí; si no hay
  // ninguno, no hay nada que dibujar.
  if (!movimiento) return null;
  const m = movimiento;
  const d = describir(m);
  const cuenta = cuentas.find((c) => c.id === m.cuentaId)?.nombre;
  const destino = cuentas.find((c) => c.id === m.cuentaDestinoId)?.nombre;
  const meta = metas.find((x) => x.id === m.metaId)?.nombre;
  const pagoFijo = m.recurrenteId ? pendientes.find((r) => r.id === m.recurrenteId)?.titulo : undefined;
  const dia = DIAS_SEMANA[new Date(`${m.fecha}T00:00:00Z`).getUTCDay()];

  const etiquetaCuenta =
    m.tipo === "ingreso" || m.tipo === "retiro" ? "Entra a" : m.tipo === "transferencia" ? "Desde" : "Sale de";

  return (
    <Modal abierto={abierto} titulo="Detalle del movimiento" onCerrar={onCerrar}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-superficie-alta text-tinta-2">
          <Icono nombre={d.icono} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] text-tinta">{d.titulo}</p>
          <p className={`text-[22px] leading-tight font-semibold tabular ${COLOR_MOVIMIENTO[m.tipo]}`}>
            {SIGNO_MOVIMIENTO[m.tipo]}
            {pesos(m.monto)}
          </p>
        </div>
      </div>

      <dl className="mt-3">
        <Dato etiqueta="Tipo">{NOMBRE_TIPO[m.tipo]}</Dato>
        <Dato etiqueta="Fecha">
          <span className="capitalize">{dia}</span> {fechaLarga(m.fecha)}
        </Dato>
        {(m.tipo === "gasto" || m.tipo === "ingreso") && <Dato etiqueta="Categoría">{d.titulo}</Dato>}
        {meta && <Dato etiqueta="Meta">{meta}</Dato>}
        {cuenta && <Dato etiqueta={etiquetaCuenta}>{cuenta}</Dato>}
        {destino && m.tipo === "transferencia" && <Dato etiqueta="Hacia">{destino}</Dato>}
        {m.cuota && m.cuotas ? (
          <Dato etiqueta="Cuota">
            {m.cuota} de {m.cuotas} (compra con tarjeta de crédito)
          </Dato>
        ) : null}
        {m.recurrenteId && <Dato etiqueta="Pago fijo">{pagoFijo ?? "Viene de un pago fijo"}</Dato>}
        <Dato etiqueta="Nota">{m.nota || <span className="text-tinta-3">Sin nota</span>}</Dato>
      </dl>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Boton variante="fantasma" onClick={onRepetir}>
          <Repeat className="size-4" aria-hidden="true" />
          Repetir hoy
        </Boton>
        <Boton onClick={onEditar}>
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </Boton>
      </div>
    </Modal>
  );
}

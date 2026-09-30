"use client";

import { Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Boton } from "./boton";
import { Modal } from "./modal";

/**
 * Confirmación antes de borrar o quitar algo. `onConfirmar` hace el trabajo
 * (y muestra sus propios avisos de error); al terminar, el modal se cierra.
 */
export function Confirmar({
  abierto,
  titulo,
  descripcion,
  accion = "Eliminar",
  icono = <Trash2 className="size-4" aria-hidden="true" />,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  accion?: string;
  icono?: ReactNode;
  onConfirmar: () => Promise<unknown> | void;
  onCerrar: () => void;
}) {
  const [cargando, setCargando] = useState(false);

  async function confirmar() {
    setCargando(true);
    try {
      await onConfirmar();
      onCerrar();
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal abierto={abierto} titulo={titulo} descripcion={descripcion} onCerrar={cargando ? () => {} : onCerrar}>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Boton variante="fantasma" onClick={onCerrar} disabled={cargando}>
          Cancelar
        </Boton>
        <Boton variante="peligro" cargando={cargando} onClick={confirmar}>
          {icono}
          {accion}
        </Boton>
      </div>
    </Modal>
  );
}

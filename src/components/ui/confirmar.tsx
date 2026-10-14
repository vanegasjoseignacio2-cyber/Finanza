"use client";

import { Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Boton } from "./boton";
import { Campo } from "./campo";
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
  palabra,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  accion?: string;
  icono?: ReactNode;
  /** Si se indica, hay que escribirla (sin importar mayúsculas) para habilitar la acción. */
  palabra?: string;
  onConfirmar: () => Promise<unknown> | void;
  onCerrar: () => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [escrito, setEscrito] = useState("");
  const habilitado = !palabra || escrito.trim().toLowerCase() === palabra.toLowerCase();

  function cerrar() {
    setEscrito("");
    onCerrar();
  }

  async function confirmar(evento?: FormEvent) {
    evento?.preventDefault();
    // El modal va en un portal: sin esto el envío subiría por React hasta un formulario padre.
    evento?.stopPropagation();
    if (!habilitado || cargando) return;
    setCargando(true);
    try {
      await onConfirmar();
      cerrar();
    } finally {
      setCargando(false);
    }
  }

  return (
    <Modal abierto={abierto} titulo={titulo} descripcion={descripcion} onCerrar={cargando ? () => {} : cerrar}>
      <form onSubmit={confirmar} className="flex flex-col gap-4">
        {palabra && (
          <Campo
            etiqueta={`Escribe «${palabra}» para confirmar`}
            value={escrito}
            onChange={(e) => setEscrito(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={palabra}
          />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton type="button" variante="fantasma" onClick={cerrar} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="peligro" cargando={cargando} disabled={!habilitado}>
            {icono}
            {accion}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}

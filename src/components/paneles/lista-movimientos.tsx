"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Trash2, X } from "lucide-react";
import { useState } from "react";
import { IconoCategoria } from "@/components/iconos";
import { Vacio } from "@/components/ui/tarjeta";
import { etiquetaCategoria } from "@/lib/categorias";
import { pesos } from "@/lib/dinero";
import { fechaCorta } from "@/lib/fechas";
import type { Movimiento } from "@/lib/types";

function signo(tipo: Movimiento["tipo"]): string {
  return tipo === "gasto" ? "−" : "+";
}

function colorMonto(tipo: Movimiento["tipo"]): string {
  if (tipo === "ahorro") return "text-verde";
  if (tipo === "ingreso") return "text-azul";
  return "text-tinta";
}

function descripcion(m: Movimiento): string {
  if (m.tipo === "ahorro") return "Aporte a ahorro";
  if (m.tipo === "ingreso") return "Ingreso extra";
  return etiquetaCategoria(m.categoria);
}

export function ListaMovimientos({
  movimientos,
  onEliminar,
  mensajeVacio = "Aún no hay movimientos en este mes.",
}: {
  movimientos: Movimiento[];
  onEliminar?: (id: string) => void | Promise<void>;
  mensajeVacio?: string;
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  if (movimientos.length === 0) {
    return <Vacio mensaje={mensajeVacio} />;
  }

  return (
    <ul className="flex flex-col">
      <AnimatePresence initial={false}>
        {movimientos.map((m) => (
          <motion.li
            key={m.id}
            layout
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-borde-suave last:border-b-0"
          >
            <div className="flex items-center gap-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-superficie-alta text-tinta-2">
                <IconoCategoria id={m.categoria} className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] text-tinta">{descripcion(m)}</p>
                <p className="truncate text-[12.5px] text-tinta-3">
                  {fechaCorta(m.fecha)}
                  {m.nota ? ` · ${m.nota}` : ""}
                </p>
              </div>

              <span className={`shrink-0 text-[14.5px] font-semibold tabular ${colorMonto(m.tipo)}`}>
                {signo(m.tipo)}
                {pesos(m.monto)}
              </span>

              {onEliminar &&
                (confirmando === m.id ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Confirmar eliminación de ${descripcion(m)}`}
                      disabled={borrando === m.id}
                      onClick={async () => {
                        setBorrando(m.id);
                        await onEliminar(m.id);
                        setBorrando(null);
                        setConfirmando(null);
                      }}
                      className="area-toque grid size-9 cursor-pointer place-items-center rounded-lg bg-alerta/15 text-alerta transition-colors hover:bg-alerta/25 disabled:opacity-50"
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancelar"
                      onClick={() => setConfirmando(null)}
                      className="area-toque grid size-9 cursor-pointer place-items-center rounded-lg text-tinta-3 transition-colors hover:text-tinta"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Eliminar ${descripcion(m)} de ${fechaCorta(m.fecha)}`}
                    onClick={() => setConfirmando(m.id)}
                    className="area-toque grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-alerta/10 hover:text-alerta"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                ))}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

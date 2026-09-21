"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellOff,
  CalendarClock,
  Check,
  CircleAlert,
  CircleCheck,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { IconoCategoria } from "@/components/iconos";
import { useAvisos } from "@/components/ui/avisos";
import { Vacio } from "@/components/ui/tarjeta";
import { etiquetaCategoria } from "@/lib/categorias";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import { fechaCorta, mesActual } from "@/lib/fechas";
import type { RecordatorioCalculado } from "@/lib/types";

interface Insignia {
  texto: string;
  clase: string;
  Icono: typeof Bell;
}

function insignia(r: RecordatorioCalculado): Insignia {
  if (!r.activo) {
    return { texto: "En pausa", clase: "border-borde text-tinta-3", Icono: BellOff };
  }
  if (r.pagado) {
    return { texto: "Pagado", clase: "border-verde/35 text-verde", Icono: CircleCheck };
  }
  if (r.vencido) {
    return { texto: "Vencido", clase: "border-alerta/40 text-alerta", Icono: CircleAlert };
  }
  if (r.diasFaltantes === 0) {
    return { texto: "Vence hoy", clase: "border-alerta/40 text-alerta", Icono: CircleAlert };
  }
  if (r.diasFaltantes <= 3) {
    return {
      texto: r.diasFaltantes === 1 ? "Mañana" : `En ${r.diasFaltantes} días`,
      clase: "border-aviso/40 text-aviso",
      Icono: CalendarClock,
    };
  }
  return {
    texto: `En ${r.diasFaltantes} días`,
    clase: "border-borde text-tinta-3",
    Icono: CalendarClock,
  };
}

export function ListaRecordatorios({
  recordatorios,
  onCambio,
  conAcciones = false,
  limite,
}: {
  recordatorios: RecordatorioCalculado[];
  onCambio?: () => void | Promise<void>;
  conAcciones?: boolean;
  limite?: number;
}) {
  const avisos = useAvisos();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const visibles = limite ? recordatorios.slice(0, limite) : recordatorios;

  if (visibles.length === 0) {
    return (
      <Vacio mensaje="No tienes recordatorios. Crea uno para que el correo diario te avise antes de cada pago." />
    );
  }

  async function ejecutar(id: string, accion: () => Promise<unknown>, mensaje: string) {
    setOcupado(id);
    try {
      await accion();
      avisos.exito(mensaje);
      await onCambio?.();
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos actualizar el recordatorio.");
    } finally {
      setOcupado(null);
      setConfirmando(null);
    }
  }

  return (
    <ul className="flex flex-col">
      <AnimatePresence initial={false}>
        {visibles.map((r) => {
          const marca = insignia(r);
          const mes = mesActual();
          return (
            <motion.li
              key={r.id}
              layout
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-borde-suave last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-superficie-alta text-tinta-2">
                  {r.categoria ? (
                    <IconoCategoria id={r.categoria} className="size-4" />
                  ) : (
                    <Bell className="size-4" aria-hidden="true" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] text-tinta">{r.titulo}</p>
                  <p className="truncate text-[12.5px] text-tinta-3">
                    Día {r.dia} · {fechaCorta(r.vencimiento)}
                    {r.categoria ? ` · ${etiquetaCategoria(r.categoria)}` : ""}
                    {r.montoEstimado > 0 ? ` · ${pesos(r.montoEstimado)}` : ""}
                  </p>
                </div>

                <span
                  className={`flex items-center gap-x-3 gap-y-2 ${
                    conAcciones
                      ? "w-full justify-between pl-12 sm:w-auto sm:justify-end sm:pl-0"
                      : "shrink-0"
                  }`}
                >
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${marca.clase}`}
                  >
                    <marca.Icono className="size-3.5" aria-hidden="true" />
                    {marca.texto}
                  </span>

                {conAcciones && (
                  <span className="flex shrink-0 items-center gap-1">
                    {confirmando === r.id ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Confirmar eliminación de ${r.titulo}`}
                          disabled={ocupado === r.id}
                          onClick={() =>
                            ejecutar(
                              r.id,
                              () => peticion(`/api/recordatorios/${r.id}`, { method: "DELETE" }),
                              "Recordatorio eliminado.",
                            )
                          }
                          className="area-toque grid size-9 cursor-pointer place-items-center rounded-lg bg-alerta/15 text-alerta transition-colors hover:bg-alerta/25 disabled:opacity-50"
                        >
                          <Check className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancelar"
                          onClick={() => setConfirmando(null)}
                          className="area-toque grid size-9 cursor-pointer place-items-center rounded-lg text-tinta-3 hover:text-tinta"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          aria-label={
                            r.pagado
                              ? `Marcar ${r.titulo} como no pagado este mes`
                              : `Marcar ${r.titulo} como pagado este mes`
                          }
                          disabled={ocupado === r.id}
                          onClick={() =>
                            ejecutar(
                              r.id,
                              () =>
                                peticion(`/api/recordatorios/${r.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify(
                                    r.pagados.includes(mes)
                                      ? { desmarcarMes: mes }
                                      : { marcarPagado: mes },
                                  ),
                                }),
                              r.pagados.includes(mes)
                                ? "Marcado como pendiente."
                                : "Marcado como pagado este mes.",
                            )
                          }
                          className={`area-toque grid size-9 cursor-pointer place-items-center rounded-lg transition-colors disabled:opacity-50 ${
                            r.pagados.includes(mes)
                              ? "bg-verde/15 text-verde"
                              : "text-tinta-3 hover:bg-verde/10 hover:text-verde"
                          }`}
                        >
                          <CircleCheck className="size-4" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          aria-label={r.activo ? `Pausar avisos de ${r.titulo}` : `Reactivar avisos de ${r.titulo}`}
                          disabled={ocupado === r.id}
                          onClick={() =>
                            ejecutar(
                              r.id,
                              () =>
                                peticion(`/api/recordatorios/${r.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ activo: !r.activo }),
                                }),
                              r.activo ? "Avisos en pausa." : "Avisos reactivados.",
                            )
                          }
                          className="area-toque grid size-9 cursor-pointer place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-superficie-alta hover:text-tinta disabled:opacity-50"
                        >
                          {r.activo ? (
                            <Bell className="size-4" aria-hidden="true" />
                          ) : (
                            <BellOff className="size-4" aria-hidden="true" />
                          )}
                        </button>

                        <button
                          type="button"
                          aria-label={`Eliminar ${r.titulo}`}
                          onClick={() => setConfirmando(r.id)}
                          className="area-toque grid size-9 cursor-pointer place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-alerta/10 hover:text-alerta"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </span>
                )}
                </span>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

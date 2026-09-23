"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { pesos, pesosCompacto, techoBonito } from "@/lib/dinero";
import { AZUL_SERIE, VERDE_SERIE } from "@/lib/paleta";
import type { PuntoTendencia } from "@/lib/types";

const SERIES = [
  { clave: "gastado", etiqueta: "Gastado", color: AZUL_SERIE },
  { clave: "ahorrado", etiqueta: "Ahorrado", color: VERDE_SERIE },
] as const;

export function TendenciaMensual({ puntos }: { puntos: PuntoTendencia[] }) {
  const sinMovimiento = useReducedMotion();
  const [activo, setActivo] = useState<number | null>(null);

  // La escala sube al siguiente número redondo: el eje se lee mejor.
  // La escala incluye el ingreso: la línea de referencia nunca se sale del gráfico.
  const maximo = techoBonito(Math.max(...puntos.flatMap((p) => [p.gastado, Math.max(0, p.ahorrado), p.ingreso]), 1));
  const hayDatos = puntos.some((p) => p.gastado > 0 || p.ahorrado > 0);

  if (!hayDatos) {
    return (
      <p className="rounded-xl border border-dashed border-borde-suave px-4 py-10 text-center text-[13.5px] text-tinta-3">
        Aún no hay historial. Registra movimientos y aquí verás cómo se mueven tus
        meses.
      </p>
    );
  }

  return (
    <div>
      <ul className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {SERIES.map((serie) => (
          <li key={serie.clave} className="flex items-center gap-2 text-[12.5px] text-tinta-2">
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: serie.color }}
              aria-hidden="true"
            />
            {serie.etiqueta}
          </li>
        ))}
        <li className="flex items-center gap-2 text-[12.5px] text-tinta-2">
          <span className="w-3.5 border-t-2 border-dashed border-tinta-2" aria-hidden="true" />
          Ingreso del mes
        </li>
      </ul>

      <div className="relative">
        {/* Rejilla de fondo, deliberadamente tenue. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between">
          {[1, 0.5, 0].map((nivel) => (
            <div key={nivel} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-right text-[10.5px] tabular text-tinta-3">
                {nivel === 0 ? "0" : pesosCompacto(maximo * nivel)}
              </span>
              <span className="h-px flex-1 bg-borde-suave" />
            </div>
          ))}
        </div>

        <div className="flex h-44 items-end gap-1 pl-12 sm:h-52 sm:gap-2">
          {puntos.map((punto, indice) => {
            const resaltado = activo === indice;
            return (
              <button
                key={punto.mes}
                type="button"
                onMouseEnter={() => setActivo(indice)}
                onMouseLeave={() => setActivo((a) => (a === indice ? null : a))}
                onFocus={() => setActivo(indice)}
                onBlur={() => setActivo((a) => (a === indice ? null : a))}
                onClick={() => setActivo((a) => (a === indice ? null : indice))}
                aria-label={`${punto.etiqueta}: ingreso ${pesos(punto.ingreso)}, gastado ${pesos(punto.gastado)}, ahorrado ${pesos(punto.ahorrado)}`}
                className="group relative flex h-full flex-1 cursor-pointer flex-col justify-end rounded-lg pb-7 transition-colors hover:bg-superficie-alta/40 focus-visible:bg-superficie-alta/40"
              >
                {resaltado && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    role="status"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max -translate-x-1/2 rounded-lg border border-borde bg-superficie px-2.5 py-2 text-left shadow-xl"
                  >
                    <span className="flex items-center gap-2 text-[11.5px] whitespace-nowrap">
                      <span className="w-2 border-t-2 border-dashed border-tinta-2" aria-hidden="true" />
                      <span className="text-tinta-3">Ingreso</span>
                      <span className="ml-auto font-semibold tabular text-tinta">{pesos(punto.ingreso)}</span>
                    </span>
                    {SERIES.map((serie) => (
                      <span key={serie.clave} className="flex items-center gap-2 text-[11.5px] whitespace-nowrap">
                        <span
                          className="size-2 rounded-[2px]"
                          style={{ backgroundColor: serie.color }}
                          aria-hidden="true"
                        />
                        <span className="text-tinta-3">{serie.etiqueta}</span>
                        <span className="ml-auto font-semibold tabular text-tinta">
                          {pesos(punto[serie.clave])}
                        </span>
                      </span>
                    ))}
                  </motion.div>
                )}

                {punto.ingreso > 0 && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-1.5 border-t-2 border-dashed border-tinta-2/80"
                    style={{ bottom: `calc(1.75rem + (100% - 1.75rem) * ${punto.ingreso / maximo})` }}
                  />
                )}
                <span className="flex h-full items-end justify-center gap-[2px]">
                  {SERIES.map((serie, i) => {
                    const valor = Math.max(0, punto[serie.clave]);
                    const alto = valor > 0 ? Math.max(2, (valor / maximo) * 100) : 0;
                    return (
                      <motion.span
                        key={serie.clave}
                        className="w-[38%] max-w-4 rounded-t-[4px]"
                        style={{ backgroundColor: serie.color }}
                        initial={{ height: 0 }}
                        animate={{
                          height: `${alto}%`,
                          opacity: activo === null || resaltado ? 1 : 0.55,
                        }}
                        transition={
                          sinMovimiento
                            ? { duration: 0 }
                            : {
                                height: {
                                  duration: 0.6,
                                  delay: 0.04 * indice + 0.03 * i,
                                  ease: [0.22, 1, 0.36, 1],
                                },
                                opacity: { duration: 0.15 },
                              }
                        }
                      />
                    );
                  })}
                </span>

                <span
                  className={`absolute inset-x-0 bottom-1 text-[11.5px] transition-colors ${
                    resaltado ? "text-tinta" : "text-tinta-3"
                  }`}
                >
                  {punto.etiqueta}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

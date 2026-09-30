"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Anillos, Troqueles } from "./anillado";
import type { Celda, ResumenMes } from "./datos";
import { Escala } from "./escala";
import { EsquinaDoblada } from "./esquina-doblada";
import { altoHojaApilada, HojaMes } from "./hoja-mes";
import { aspectoPortada, Portada } from "./portada";
import type { Portadas } from "@/lib/types";

const CURVA: [number, number, number, number] = [0.4, 0, 0.2, 1];
const DURACION = 0.98; // s
const ANCHO = 920;
const ANCHO_APILADO = 380;
const ALTO_HOJA = 470;
/** Por debajo de este ancho la hoja pasa a portada arriba y grilla abajo. */
const CORTE_APILADO = 640;

const PAPEL = "#141414";

function useApilado(): boolean {
  const [apilado, setApilado] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${CORTE_APILADO - 1}px)`);
    const actualizar = () => setApilado(mql.matches);
    actualizar();
    mql.addEventListener("change", actualizar);
    return () => mql.removeEventListener("change", actualizar);
  }, []);
  return apilado;
}

export interface DatosMes {
  celdas: Celda[];
  resumen: ResumenMes;
}

/**
 * Calendario de escritorio anillado: la hoja del mes se pliega en 3D sobre el
 * anillado para pasar al siguiente (o cae desde arriba al volver al anterior).
 *
 * El padre decide a qué mes ir (`destino`); este componente anima de `mes` a
 * `destino` y avisa con `onTerminar` para que el padre fije el nuevo mes.
 */
export function CalendarioEscritorio({
  mes,
  destino,
  datosDe,
  seleccionado,
  onSeleccionar,
  onIrA,
  onTerminar,
  anterior,
  siguiente,
  portadas,
}: {
  mes: string;
  destino: string | null;
  datosDe: (mes: string) => DatosMes;
  seleccionado: string | null;
  onSeleccionar: (fecha: string) => void;
  onIrA: (mes: string) => void;
  onTerminar: () => void;
  anterior: string;
  siguiente: string;
  portadas: Portadas;
}) {
  const apilado = useApilado();
  const animando = destino !== null;
  const adelante = destino !== null && destino > mes;

  // Hacia adelante la hoja que se va es la del mes actual y la de atrás es el
  // destino; hacia atrás es al revés: el mes anterior cae encima del actual.
  const mesArriba = destino !== null && !adelante ? destino : mes;
  const mesAtras = destino !== null && adelante ? destino : mes;
  const arriba = datosDe(mesArriba);
  const atras = datosDe(mesAtras);

  const filas = Math.max(arriba.celdas.length, atras.celdas.length) / 7;
  const altoHoja = apilado ? altoHojaApilada(filas) : ALTO_HOJA;

  // Deslizar sobre la hoja cambia de mes en móvil, donde las flechas son chicas.
  const inicioToque = useRef<{ x: number; y: number } | null>(null);
  const alTocar = (e: React.TouchEvent) => {
    const t = e.touches[0];
    inicioToque.current = { x: t.clientX, y: t.clientY };
  };
  const alSoltar = (e: React.TouchEvent) => {
    const inicio = inicioToque.current;
    inicioToque.current = null;
    if (!inicio) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (Math.abs(dx) < 40 || Math.abs(dy) > 60) return;
    onIrA(dx < 0 ? siguiente : anterior);
  };

  // Giro como en un calendario de atril: la hoja rota sobre el anillado y su
  // borde inferior viene hacia quien mira (translateZ, nunca `y` negativo, que
  // la hacía flotar hacia arriba). El primer ~20% casi no gira: ahí se ve la
  // esquina doblarse antes de que despegue el papel. La torsión mínima
  // (rotateZ) rompe la simetría que delataba la animación como CSS.
  const giroHoja = !animando
    ? { rotateX: 0, rotateZ: 0, z: 0 }
    : adelante
      ? {
          rotateX: [0, 2, 6, 20, 52, 98, 142, 168],
          rotateZ: [0, -0.5, -1.2, -1.6, -1.4, -1, -0.4, 0],
          z: [0, 30, 56, 82, 94, 78, 40, 0],
        }
      : {
          rotateX: [168, 142, 98, 52, 20, 6, 2, 0],
          rotateZ: [0, -0.4, -1, -1.4, -1.6, -1.2, -0.5, 0],
          z: [0, 40, 78, 94, 82, 56, 30, 0],
        };
  const transicionGiro = !animando
    ? { duration: 0 }
    : {
        duration: DURACION,
        times: adelante ? [0, 0.09, 0.19, 0.34, 0.5, 0.68, 0.86, 1] : [0, 0.14, 0.32, 0.5, 0.66, 0.81, 0.91, 1],
        ease: CURVA,
      };

  // Línea de curvatura que recorre la hoja mientras se pliega: brillo del lomo
  // seguido de la sombra del papel que se pone de canto.
  const curvatura = animando
    ? {
        opacity: [0, 0.5, 0.9, 0.75, 0],
        backgroundPosition: adelante
          ? ["50% 120%", "50% 74%", "50% 40%", "50% 8%", "50% -20%"]
          : ["50% -20%", "50% 8%", "50% 40%", "50% 74%", "50% 120%"],
      }
    : { opacity: 0, backgroundPosition: "50% 120%" };

  // Sombra bajo la hoja que se levanta (opacity, no box-shadow: no repinta).
  const sombraDespegue = animando
    ? { opacity: adelante ? [0, 0.55, 1, 0.7, 0] : [0, 0.7, 1, 0.55, 0] }
    : { opacity: 0 };

  // Sombra que la hoja levantada proyecta sobre la de abajo: pegada al lomo
  // al inicio y deslizándose hacia el pie a medida que la hoja se pone de canto.
  const barrido = animando
    ? {
        opacity: adelante ? [0.62, 0.52, 0.28, 0] : [0, 0.28, 0.52, 0.62],
        y: adelante ? ["-46%", "-24%", "-4%", "10%"] : ["10%", "-4%", "-24%", "-46%"],
      }
    : { opacity: 0, y: "0%" };

  const conTiempos = (times: number[]) => (animando ? { duration: DURACION, times, ease: CURVA } : { duration: 0 });

  return (
    <div
      onTouchStart={apilado ? alTocar : undefined}
      onTouchEnd={apilado ? alSoltar : undefined}
      className="w-full"
      style={{
        touchAction: apilado ? "pan-y" : undefined,
        filter: "drop-shadow(0 30px 40px rgba(0,0,0,.7)) drop-shadow(0 10px 16px rgba(0,0,0,.5))",
      }}
    >
      <Escala ancho={apilado ? ANCHO_APILADO : ANCHO}>
        {/* Perspectiva corta a propósito: muy alta se ve casi ortográfica. El
            punto de fuga va al centro de la hoja para que avanzar en Z se lea
            como abrirse hacia quien mira y no como subir. */}
        <div className="w-full pt-2" style={{ perspective: 1250, perspectiveOrigin: "50% 48%" }}>
          <div className="relative" style={{ transform: "rotateX(6deg)", transformStyle: "preserve-3d" }}>
            <Anillos apilado={apilado} />

            <motion.div
              animate={{ height: altoHoja }}
              transition={{ duration: 0.35, ease: CURVA }}
              className="relative"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* canto de las hojas que quedan debajo */}
              <div className="absolute rounded-[2px_2px_4px_4px] bg-[#232323]" style={{ left: 3, right: 3, top: 2, bottom: -3 }} />
              <div className="absolute rounded-[2px_2px_4px_4px] bg-[#1b1b1b]" style={{ left: 1.5, right: 1.5, top: 1, bottom: -1.5 }} />

              {/* hoja de atrás */}
              <div
                className="absolute inset-0 flex overflow-hidden rounded-[2px_2px_3px_3px]"
                style={{
                  flexDirection: apilado ? "column" : "row",
                  background: PAPEL,
                  boxShadow: "0 0 0 1px rgba(255,255,255,.06), 0 18px 34px -18px rgba(0,0,0,.8)",
                }}
              >
                <Portada mes={mesAtras} resumen={atras.resumen} aspecto={aspectoPortada(portadas, mesAtras)} apilado={apilado} />
                <HojaMes mes={mesAtras} celdas={atras.celdas} apilado={apilado} />
                <motion.div
                  aria-hidden
                  animate={barrido}
                  transition={conTiempos([0, 0.3, 0.62, 1])}
                  className="pointer-events-none absolute"
                  style={{
                    inset: "-10% -4px 0",
                    background: "linear-gradient(180deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.35) 48%,rgba(0,0,0,0) 82%)",
                  }}
                />
              </div>

              <motion.div
                aria-hidden
                animate={sombraDespegue}
                transition={conTiempos([0, 0.24, 0.5, 0.76, 1])}
                className="pointer-events-none absolute rounded-xl"
                style={{
                  left: "6%",
                  right: "6%",
                  top: "18%",
                  bottom: "-6%",
                  background: "radial-gradient(80% 70% at 50% 30%, rgba(0,0,0,.75) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,0) 75%)",
                  filter: "blur(14px)",
                }}
              />

              {/* hoja de arriba, la que se pliega */}
              <motion.div
                animate={giroHoja}
                transition={transicionGiro}
                onAnimationComplete={() => {
                  if (animando) onTerminar();
                }}
                className="absolute inset-0 rounded-[2px_2px_3px_3px]"
                style={{
                  transformOrigin: "50% -7px",
                  backfaceVisibility: "hidden",
                  transformStyle: "preserve-3d",
                  boxShadow: "0 0 0 1px rgba(255,255,255,.08), 0 22px 40px -20px rgba(0,0,0,.85)",
                }}
              >
                <div
                  className="absolute inset-0 flex overflow-hidden rounded-[2px_2px_3px_3px]"
                  style={{ flexDirection: apilado ? "column" : "row", background: PAPEL }}
                >
                  <Portada
                    mes={mesArriba}
                    resumen={arriba.resumen}
                    aspecto={aspectoPortada(portadas, mesArriba)}
                    apilado={apilado}
                  />
                  <HojaMes
                    mes={mesArriba}
                    celdas={arriba.celdas}
                    apilado={apilado}
                    seleccionado={seleccionado}
                    onSeleccionar={onSeleccionar}
                    interactivo={!animando}
                    onAnterior={() => onIrA(anterior)}
                    onSiguiente={() => onIrA(siguiente)}
                    navDeshabilitada={animando}
                  />
                  <Troqueles apilado={apilado} />
                  <motion.div
                    aria-hidden
                    animate={curvatura}
                    transition={conTiempos([0, 0.24, 0.5, 0.74, 1])}
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "100% 260%",
                      backgroundImage:
                        "linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.15) 18%,rgba(255,255,255,.14) 33%,rgba(255,255,255,.22) 38%,rgba(0,0,0,.3) 46%,rgba(0,0,0,.6) 60%,rgba(0,0,0,.4) 82%,rgba(0,0,0,0) 100%)",
                    }}
                  />
                </div>
                <EsquinaDoblada activa={animando} duracion={DURACION} curva={CURVA} adelante={adelante} tamano={apilado ? 56 : 88} />
              </motion.div>
            </motion.div>

            {/* base tipo atril */}
            <div className="relative" style={{ height: 46, marginTop: -2 }}>
              <div
                className="absolute inset-0 rounded-b-[4px]"
                style={{
                  background: "linear-gradient(180deg,#262626 0%,#0a0a0a 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 26px 30px -22px rgba(0,0,0,.9)",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-x-0"
                style={{
                  bottom: -14,
                  height: 26,
                  background: "radial-gradient(60% 100% at 50% 0%, rgba(255,255,255,.06), rgba(255,255,255,0) 70%)",
                }}
              />
            </div>
          </div>
        </div>
      </Escala>
    </div>
  );
}

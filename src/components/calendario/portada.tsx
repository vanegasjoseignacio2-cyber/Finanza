"use client";

import { useState } from "react";
import { pesos } from "@/lib/dinero";
import type { Portadas } from "@/lib/types";
import type { ResumenMes } from "@/lib/calendario";

/**
 * Seis fondos hechos con la paleta de la app (verde, agua, aviso, alerta, gris),
 * cayendo siempre a casi negro abajo para que la frase blanca se lea igual
 * sobre cualquiera. El orden importa: la base guarda el índice.
 */
export const FONDOS = [
  { nombre: "Verde", css: "linear-gradient(180deg,#34d399 0%,#059669 45%,#03140e 100%)" },
  { nombre: "Agua", css: "linear-gradient(180deg,#67e8f9 0%,#0e7490 50%,#04121c 100%)" },
  { nombre: "Ámbar", css: "linear-gradient(165deg,#fde68a 0%,#d97706 50%,#1a0f02 100%)" },
  { nombre: "Plata", css: "linear-gradient(180deg,#f3f4f6 0%,#6b7280 52%,#0a0a0a 100%)" },
  { nombre: "Rosa", css: "linear-gradient(180deg,#fda4af 0%,#be123c 55%,#12030a 100%)" },
  { nombre: "Menta", css: "linear-gradient(180deg,#a7f3d0 0%,#22d3ee 42%,#082f49 100%)" },
];

/** Frase de portada por mes: la primera línea en mayúsculas, el remate destacado. */
const FRASES: [string, string][] = [
  ["Año nuevo,", "cuentas claras."],
  ["Lo que no se mide", "no se controla."],
  ["Cada peso", "tiene un trabajo."],
  ["Primero", "págate a ti."],
  ["Gasta con intención,", "no por costumbre."],
  ["Mitad de año:", "revisa el rumbo."],
  ["Pequeños ahorros,", "grandes metas."],
  ["Un presupuesto", "es un plan."],
  ["La constancia", "vence al impulso."],
  ["Anticípate", "a los pagos fijos."],
  ["Planea diciembre", "desde hoy."],
  ["Cierra el año", "en orden."],
];

export interface AspectoPortada {
  fondo: string;
  imagen: string | null;
}

/**
 * Qué se ve en la portada de un mes: la suya propia si la tiene, si no la
 * general ("todos"), y si tampoco, el fondo que rota solo cada mes.
 */
export function aspectoPortada(portadas: Portadas, mes: string): AspectoPortada {
  const clave = portadas[mes] ? mes : portadas.todos ? "todos" : null;
  const automatico = FONDOS[(Number(mes.slice(5, 7)) - 1) % FONDOS.length].css;
  const p = clave ? portadas[clave] : null;
  if (!p || p.tipo === "auto") return { fondo: automatico, imagen: null };
  if (p.tipo === "fondo") return { fondo: FONDOS[p.fondo]?.css ?? automatico, imagen: null };
  if (p.tipo === "enlace") return { fondo: automatico, imagen: p.url };
  return { fondo: automatico, imagen: `/api/portadas/${clave}?v=${p.version}` };
}

/**
 * Foto de portada. <img> y no next/image: el optimizador pediría desde el
 * servidor cualquier enlace externo que se pegue (y exigiría listar dominios),
 * y la foto subida vive tras la sesión. Si el enlace deja de cargar queda el
 * fondo de debajo, no un ícono roto.
 */
export function FotoPortada({ src }: { src: string }) {
  const [fallo, setFallo] = useState<string | null>(null);
  if (fallo === src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFallo(src)}
      className="absolute inset-0 size-full object-cover"
    />
  );
}

/**
 * Mitad izquierda de la hoja (o franja superior en móvil): fondo o foto, cifras
 * del mes arriba y la frase abajo. La usan la hoja de arriba y la de atrás;
 * deben verse idénticas o se nota un salto justo cuando el giro termina.
 */
export function Portada({
  mes,
  resumen,
  aspecto,
  apilado,
}: {
  mes: string;
  resumen: ResumenMes;
  aspecto: AspectoPortada;
  apilado: boolean;
}) {
  const [frase, remate] = FRASES[Number(mes.slice(5, 7)) - 1];

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ background: aspecto.fondo, width: apilado ? "100%" : "40%", height: apilado ? 150 : "100%" }}
    >
      {aspecto.imagen && <FotoPortada src={aspecto.imagen} />}
      {/* Brillo diagonal: da volumen a un degradado plano; sobre una foto sobra. */}
      {!aspecto.imagen && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 70% at 100% 0%, rgba(255,255,255,.22), rgba(255,255,255,0) 60%)" }}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 38%,rgba(0,0,0,.75) 100%)" }}
      />

      <div
        className="absolute flex flex-wrap gap-1.5"
        style={{ left: apilado ? 14 : 22, right: apilado ? 14 : 22, top: apilado ? 22 : 30 }}
      >
        {resumen.pagos > 0 && (
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-semibold text-white tabular backdrop-blur-sm">
            {resumen.pagos} {resumen.pagos === 1 ? "pago fijo" : "pagos fijos"}
            {resumen.total > 0 && ` · ${pesos(resumen.total)}`}
          </span>
        )}
        {resumen.cuotas > 0 && (
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-semibold text-white tabular backdrop-blur-sm">
            {resumen.cuotas} {resumen.cuotas === 1 ? "cuota de tarjeta" : "cuotas de tarjeta"}
            {resumen.totalCuotas > 0 && ` · ${pesos(resumen.totalCuotas)}`}
          </span>
        )}
        {resumen.gastosAnotados > 0 && (
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-sm">
            {resumen.gastosAnotados} {resumen.gastosAnotados === 1 ? "gasto anotado" : "gastos anotados"}
          </span>
        )}
        {resumen.festivos > 0 && (
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-sm">
            {resumen.festivos} {resumen.festivos === 1 ? "festivo" : "festivos"}
          </span>
        )}
      </div>

      <div className="absolute" style={{ left: apilado ? 16 : 24, right: apilado ? 16 : 24, bottom: apilado ? 14 : 26 }}>
        <div
          className="font-medium tracking-[0.04em] text-white/90 uppercase"
          style={{ fontSize: apilado ? 11.5 : 14, lineHeight: 1.3, textShadow: "0 1px 6px rgba(0,0,0,.5)" }}
        >
          {frase}
        </div>
        <div
          className="mt-1 font-display font-semibold text-white"
          style={{ fontSize: apilado ? 19 : 27, lineHeight: 1.05, textShadow: "0 1px 8px rgba(0,0,0,.5)" }}
        >
          {remate}
        </div>
      </div>
    </div>
  );
}

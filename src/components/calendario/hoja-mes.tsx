"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { pesos } from "@/lib/dinero";
import { fechaLarga, MESES } from "@/lib/fechas";
import type { Celda, DiaCalendario } from "./datos";

const SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Medidas de la grilla. Viven aquí (y no sueltas en los estilos) porque la hoja
 * apilada necesita su alto exacto de antemano: las hojas están en posición
 * absoluta, una encima de otra, y el contenedor no puede medirlas solo.
 */
const MEDIDAS = {
  normal: { padV: [26, 18], padH: 28, cabecera: 40, divisor: [12, 14], semana: 18, dia: [32, 28], fuente: 15, pie: 34 },
  apilado: { padV: [16, 14], padH: 18, cabecera: 36, divisor: [8, 10], semana: 16, dia: [28, 24], fuente: 13.5, pie: 30 },
} as const;
const ALTO_PUNTO = 4;
const SEPARACION_FILAS = 4;
const MARGEN_PIE = 10;
export const ALTO_PORTADA_APILADA = 150;

/** Alto total de la hoja apilada (portada + grilla) para un mes de `filas` semanas. */
export function altoHojaApilada(filas: number): number {
  const m = MEDIDAS.apilado;
  const fila = m.dia[1] + 2 + ALTO_PUNTO;
  return (
    ALTO_PORTADA_APILADA +
    m.padV[0] + m.padV[1] +
    m.cabecera +
    m.divisor[0] + 2 + m.divisor[1] +
    m.semana +
    filas * fila + (filas - 1) * SEPARACION_FILAS +
    MARGEN_PIE + m.pie
  );
}

type Tono = "vencido" | "pendiente" | "pagado" | null;

function tonoDePagos(c: DiaCalendario): Tono {
  if (c.pagos.length === 0) return null;
  if (c.pagos.some((p) => p.vencido && !p.pagado)) return "vencido";
  if (c.pagos.some((p) => !p.pagado)) return "pendiente";
  return "pagado";
}

const COLOR_TONO: Record<Exclude<Tono, null>, string> = {
  vencido: "var(--color-alerta)",
  pendiente: "var(--color-verde)",
  pagado: "var(--color-borde)",
};

function detallesDe(c: DiaCalendario): string[] {
  return [
    c.festivo?.nombre,
    ...c.pagos.map(
      (p) => `${p.titulo}${p.montoEstimado > 0 ? `: ${pesos(p.montoEstimado)}` : ""}${p.pagado ? " (pagado)" : ""}`,
    ),
  ].filter((d): d is string => Boolean(d));
}

function Dia({
  c,
  seleccionado,
  interactivo,
  apilado,
  onSeleccionar,
}: {
  c: DiaCalendario;
  seleccionado: boolean;
  interactivo: boolean;
  apilado: boolean;
  onSeleccionar?: (fecha: string) => void;
}) {
  const m = apilado ? MEDIDAS.apilado : MEDIDAS.normal;
  const tono = tonoDePagos(c);
  const destacado = c.esDomingo || c.festivo;

  const color = seleccionado
    ? "text-[#04121c]"
    : c.festivo
      ? "text-aviso"
      : c.esDomingo
        ? "text-alerta"
        : "text-tinta";
  const fondo = seleccionado
    ? "bg-acento"
    : c.esHoy
      ? "bg-white/12"
      : interactivo
        ? "hover:bg-white/8"
        : "";

  const estilo = {
    width: m.dia[0],
    height: m.dia[1],
    fontSize: m.fuente,
    // Días con pago: borde rectangular (en vez del redondeado normal) para
    // distinguirlos de un festivo aunque ambas marcas caigan el mismo día.
    borderRadius: tono ? 4 : 8,
    border: `1.5px solid ${tono && !seleccionado ? COLOR_TONO[tono] : "transparent"}`,
    boxShadow: c.esHoy && !seleccionado && !tono ? "inset 0 0 0 1px rgba(255,255,255,.45)" : undefined,
  };
  const clase = `flex items-center justify-center tabular transition-colors duration-150 ${
    seleccionado || destacado || tono ? "font-semibold" : "font-normal"
  } ${color} ${fondo}`;

  const punto = (
    <span
      aria-hidden
      className="rounded-full"
      style={{ width: ALTO_PUNTO, height: ALTO_PUNTO, background: tono ? COLOR_TONO[tono] : "transparent" }}
    />
  );

  // La hoja de atrás no es interactiva: número plano, sin tooltip ni foco.
  if (!interactivo) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className={clase} style={estilo}>
          {c.dia}
        </div>
        {punto}
      </div>
    );
  }

  const detalles = detallesDe(c);
  const boton = (
    <button
      type="button"
      onClick={() => onSeleccionar?.(c.fecha)}
      aria-pressed={seleccionado}
      aria-label={[fechaLarga(c.fecha), ...detalles].join(". ")}
      className={`${clase} cursor-pointer`}
      style={estilo}
    >
      {c.dia}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-0.5">
      {detalles.length > 0 ? <Tooltip texto={detalles.join(" · ")}>{boton}</Tooltip> : boton}
      {punto}
    </div>
  );
}

function BotonMes({
  etiqueta,
  onClick,
  deshabilitado,
  apilado,
  children,
}: {
  etiqueta: string;
  onClick?: () => void;
  deshabilitado: boolean;
  apilado: boolean;
  children: React.ReactNode;
}) {
  const lado = apilado ? 36 : 30;
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      disabled={deshabilitado}
      className="grid place-items-center rounded-full border border-borde-suave text-tinta-2 transition-colors hover:border-tinta-3 hover:text-tinta disabled:opacity-40"
      style={{ width: lado, height: lado }}
    >
      {children}
    </button>
  );
}

const LEYENDA = [
  { texto: "Festivo", clase: "text-aviso", marca: null },
  { texto: "Pendiente", clase: "text-tinta-3", marca: COLOR_TONO.pendiente },
  { texto: "Vencido", clase: "text-tinta-3", marca: COLOR_TONO.vencido },
  { texto: "Pagado", clase: "text-tinta-3", marca: COLOR_TONO.pagado },
];

/**
 * Mitad derecha de la hoja (o parte inferior en móvil): mes y año, la grilla de
 * días y una leyenda al pie. Solo la hoja de arriba recibe `interactivo` y las
 * flechas; la de atrás es decorado mientras se pasa la página.
 */
export function HojaMes({
  mes,
  celdas,
  apilado,
  seleccionado = null,
  onSeleccionar,
  interactivo = false,
  onAnterior,
  onSiguiente,
  navDeshabilitada = false,
}: {
  mes: string;
  celdas: Celda[];
  apilado: boolean;
  seleccionado?: string | null;
  onSeleccionar?: (fecha: string) => void;
  interactivo?: boolean;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  navDeshabilitada?: boolean;
}) {
  const m = apilado ? MEDIDAS.apilado : MEDIDAS.normal;
  const [anio, numeroMes] = mes.split("-").map(Number);
  const conNavegacion = Boolean(onAnterior && onSiguiente);

  return (
    <div
      className="flex flex-col bg-[#141414]"
      style={{
        flex: apilado ? "1 1 auto" : 1,
        width: apilado ? "100%" : undefined,
        padding: `${m.padV[0]}px ${m.padH}px ${m.padV[1]}px`,
      }}
    >
      <div className="flex items-center justify-between gap-2.5" style={{ height: m.cabecera }}>
        <div className="flex items-baseline" style={{ gap: apilado ? 6 : 10 }}>
          <span
            className="font-display font-semibold tracking-[0.06em] text-tinta uppercase"
            style={{ fontSize: apilado ? 22 : 36, lineHeight: 1 }}
          >
            {MESES[numeroMes - 1]}
          </span>
          <span className="font-medium tracking-[0.18em] text-tinta-3 tabular" style={{ fontSize: apilado ? 12 : 15 }}>
            {anio}
          </span>
        </div>

        {conNavegacion && (
          <div className="flex shrink-0 gap-1.5">
            <BotonMes etiqueta="Mes anterior" onClick={onAnterior} deshabilitado={navDeshabilitada} apilado={apilado}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </BotonMes>
            <BotonMes etiqueta="Mes siguiente" onClick={onSiguiente} deshabilitado={navDeshabilitada} apilado={apilado}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </BotonMes>
          </div>
        )}
      </div>

      <div
        aria-hidden
        style={{
          height: 2,
          margin: `${m.divisor[0]}px 0 ${m.divisor[1]}px`,
          background: "linear-gradient(90deg,#ffffff 0%,#ffffff 22%,#333333 22%)",
        }}
      />

      <div className="grid grid-cols-7 text-center text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ height: m.semana }}>
        {SEMANA.map((d, i) => (
          <div key={d} className={i === 6 ? "text-alerta" : "text-tinta-3"}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7" style={{ rowGap: SEPARACION_FILAS }}>
        {celdas.map((c, i) =>
          c ? (
            <Dia
              key={c.fecha}
              c={c}
              seleccionado={c.fecha === seleccionado}
              interactivo={interactivo}
              apilado={apilado}
              onSeleccionar={onSeleccionar}
            />
          ) : (
            <div key={`vacio-${i}`} style={{ height: m.dia[1] + 2 + ALTO_PUNTO }} />
          ),
        )}
      </div>

      <div
        className="flex items-center gap-3 overflow-hidden border-t border-borde-suave text-[11px] whitespace-nowrap"
        style={{ marginTop: apilado ? MARGEN_PIE : "auto", height: m.pie }}
      >
        {LEYENDA.map((l) => (
          <span key={l.texto} className={`flex items-center gap-1.5 ${l.clase}`}>
            {l.marca ? (
              <span className="size-2.5 rounded-[3px]" style={{ border: `1.5px solid ${l.marca}` }} aria-hidden />
            ) : (
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
            )}
            {l.texto}
          </span>
        ))}
      </div>
    </div>
  );
}

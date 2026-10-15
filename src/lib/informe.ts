/**
 * Informe de gastos: en qué se fue la plata, categoría por categoría.
 *
 * Todo es cálculo puro sobre los gastos ya leídos (como el resto de `finanzas.ts`),
 * para poder probarlo. Cuenta lo mismo que "Gastado" en Hoy: los gastos de cada
 * mes (una compra con tarjeta, en el mes en que se paga) y las cuotas en su mes.
 */
import { diasDelMes, MESES, mesCorto, nombreMes, sumarMeses } from "./fechas";
import type { Movimiento } from "./types";

export const PERIODOS_INFORME = ["mes", "3m", "6m", "12m", "todo"] as const;
export type PeriodoInforme = (typeof PERIODOS_INFORME)[number];

export function esPeriodoInforme(valor: unknown): valor is PeriodoInforme {
  return typeof valor === "string" && (PERIODOS_INFORME as readonly string[]).includes(valor);
}

const MESES_POR_PERIODO: Record<Exclude<PeriodoInforme, "todo">, number> = { mes: 1, "3m": 3, "6m": 6, "12m": 12 };

/** Primer y último mes (YYYY-MM) de un periodo que termina en `hasta`; `desde` es null para "todo". */
export function rangoDelInforme(periodo: PeriodoInforme, hasta: string): { desde: string | null; hasta: string } {
  if (periodo === "todo") return { desde: null, hasta };
  return { desde: sumarMeses(hasta, -(MESES_POR_PERIODO[periodo] - 1)), hasta };
}

/** El periodo de igual duración justo antes de éste, para comparar. No hay para "todo". */
export function rangoAnteriorDelInforme(
  periodo: PeriodoInforme,
  desde: string | null,
): { desde: string; hasta: string } | null {
  if (periodo === "todo" || !desde) return null;
  const n = MESES_POR_PERIODO[periodo];
  return { desde: sumarMeses(desde, -n), hasta: sumarMeses(desde, -1) };
}

export interface CategoriaInforme {
  categoria: string;
  total: number;
  /** Parte del total gastado, en porcentaje (0-100, con un decimal). */
  porcentaje: number;
  /** Cuántos gastos son. */
  cantidad: number;
  promedio: number;
  /** Lo gastado en el periodo anterior equivalente; null si no hay con qué comparar. */
  anterior: number | null;
  /** Cambio frente al periodo anterior, en porcentaje; null si antes no se gastó nada o no hay comparación. */
  variacion: number | null;
  /** Los gastos más grandes de la categoría (hasta 5). */
  mayores: Movimiento[];
}

export interface MesInforme {
  mes: string;
  etiqueta: string;
  total: number;
}

export interface Informe {
  desde: string;
  hasta: string;
  /** Meses que abarca el informe. */
  meses: number;
  total: number;
  cantidad: number;
  promedioMensual: number;
  /** Lo gastado por día transcurrido; null si el periodo todavía no empieza. */
  promedioDiario: number | null;
  anterior: number | null;
  variacion: number | null;
  /** De la que más gastaste a la que menos. */
  categorias: CategoriaInforme[];
  porMes: MesInforme[];
  /** Los 10 gastos más grandes del periodo. */
  mayores: Movimiento[];
  /** La categoría cuyo gasto más subió (en pesos) frente al periodo anterior, si subió alguna. */
  masSubio: { categoria: string; diferencia: number } | null;
  /** La que más bajó. */
  masBajo: { categoria: string; diferencia: number } | null;
}

/** "Octubre 2026" o "Agosto – octubre 2026". */
export function textoPeriodoInforme(i: Pick<Informe, "desde" | "hasta" | "meses">): string {
  const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
  if (i.meses === 1) return mayuscula(nombreMes(i.hasta));
  const mismoAnio = i.desde.slice(0, 4) === i.hasta.slice(0, 4);
  const desde = mismoAnio ? MESES[Number(i.desde.slice(5, 7)) - 1] : nombreMes(i.desde);
  return mayuscula(`${desde} – ${nombreMes(i.hasta)}`);
}

export interface EntradaInforme {
  /** Gastos del periodo (los demás tipos se ignoran). */
  gastos: Movimiento[];
  /** Gastos del periodo anterior equivalente; no se pasa si no hay con qué comparar. */
  anteriores?: Movimiento[];
  /** Primer mes del informe; null = desde el primer mes con gastos. */
  desde: string | null;
  hasta: string;
  hoy: string;
}

const porMonto = (a: Movimiento, b: Movimiento) => b.monto - a.monto || b.fecha.localeCompare(a.fecha);

function cambioPorcentual(ahora: number, antes: number): number | null {
  return antes > 0 ? Math.round(((ahora - antes) / antes) * 100) : null;
}

export function calcularInforme(e: EntradaInforme): Informe {
  const gastos = e.gastos.filter((m) => m.tipo === "gasto" && m.mes <= e.hasta && (!e.desde || m.mes >= e.desde));
  // Sin gastos en el periodo anterior (p. ej. se empezó a usar la app hace poco) no hay con qué comparar.
  const anteriores = e.anteriores?.filter((m) => m.tipo === "gasto");
  const comparar = Boolean(anteriores && anteriores.length > 0);
  const total = gastos.reduce((s, m) => s + m.monto, 0);

  // Meses del informe: del primero con gastos (si es "todo") hasta el último.
  const primero = e.desde ?? gastos.reduce((min, m) => (m.mes < min ? m.mes : min), e.hasta);
  const meses: string[] = [];
  for (let m = primero; m <= e.hasta && meses.length < 600; m = sumarMeses(m, 1)) meses.push(m);

  const porMes: MesInforme[] = meses.map((mes) => ({
    mes,
    etiqueta: `${mesCorto(mes)} ${mes.slice(2, 4)}`,
    total: gastos.filter((m) => m.mes === mes).reduce((s, m) => s + m.monto, 0),
  }));

  // Días transcurridos: los meses cerrados completos y el actual hasta hoy.
  const mesHoy = e.hoy.slice(0, 7);
  const dias = meses.reduce((s, m) => s + (m < mesHoy ? diasDelMes(m) : m === mesHoy ? Number(e.hoy.slice(8, 10)) : 0), 0);

  const anteriorPorCategoria = new Map<string, number>();
  for (const m of anteriores ?? []) anteriorPorCategoria.set(m.categoria, (anteriorPorCategoria.get(m.categoria) ?? 0) + m.monto);
  const totalAnterior = comparar && anteriores ? anteriores.reduce((s, m) => s + m.monto, 0) : null;

  const porCategoria = new Map<string, Movimiento[]>();
  for (const m of gastos) porCategoria.set(m.categoria, [...(porCategoria.get(m.categoria) ?? []), m]);

  const categorias: CategoriaInforme[] = [...porCategoria.entries()]
    .map(([categoria, lista]) => {
      const sumaCategoria = lista.reduce((s, m) => s + m.monto, 0);
      const anterior = comparar ? (anteriorPorCategoria.get(categoria) ?? 0) : null;
      return {
        categoria,
        total: sumaCategoria,
        porcentaje: total ? Math.round((sumaCategoria / total) * 1000) / 10 : 0,
        cantidad: lista.length,
        promedio: Math.round(sumaCategoria / lista.length),
        anterior,
        variacion: anterior === null ? null : cambioPorcentual(sumaCategoria, anterior),
        mayores: [...lista].sort(porMonto).slice(0, 5),
      };
    })
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria));

  // Frente al periodo anterior, también cuentan las categorías en que ya no se gastó.
  const diferencias = comparar
    ? [...new Set([...porCategoria.keys(), ...anteriorPorCategoria.keys()])].map((categoria) => ({
        categoria,
        diferencia: (porCategoria.get(categoria) ?? []).reduce((s, m) => s + m.monto, 0) - (anteriorPorCategoria.get(categoria) ?? 0),
      }))
    : [];
  const masSubio = diferencias.filter((d) => d.diferencia > 0).sort((a, b) => b.diferencia - a.diferencia)[0] ?? null;
  const masBajo = diferencias.filter((d) => d.diferencia < 0).sort((a, b) => a.diferencia - b.diferencia)[0] ?? null;

  return {
    desde: primero,
    hasta: e.hasta,
    meses: meses.length,
    total,
    cantidad: gastos.length,
    promedioMensual: meses.length ? Math.round(total / meses.length) : 0,
    promedioDiario: dias > 0 ? Math.round(total / dias) : null,
    anterior: totalAnterior,
    variacion: totalAnterior === null ? null : cambioPorcentual(total, totalAnterior),
    categorias,
    porMes,
    mayores: [...gastos].sort(porMonto).slice(0, 10),
    masSubio,
    masBajo,
  };
}

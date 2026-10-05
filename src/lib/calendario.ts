import { diasDelMes } from "./fechas";
import { festivosDelMes, type Festivo } from "./festivos";
import type { GastoAgendado, RecordatorioCalculado } from "./types";

export interface DiaCalendario {
  fecha: string; // YYYY-MM-DD
  dia: number;
  esHoy: boolean;
  /** Ya pasó (antes de hoy). */
  pasado: boolean;
  esDomingo: boolean;
  festivo: Festivo | null;
  pagos: RecordatorioCalculado[];
  /** Cuotas de tarjeta de crédito y gastos anotados con fecha: no son pagos fijos. */
  gastos: GastoAgendado[];
}

/** Casilla de la grilla: un día del mes, o null como relleno para completar semanas. */
export type Celda = DiaCalendario | null;

export interface ResumenMes {
  pagos: number;
  total: number;
  festivos: number;
  /** Cuotas de tarjeta que caen en el mes y lo que suman. */
  cuotas: number;
  totalCuotas: number;
  /** Otros gastos anotados con fecha en el mes. */
  gastosAnotados: number;
}

/**
 * Celdas de un mes en una grilla de lunes a domingo, con relleno al inicio y al
 * final para que siempre sean semanas completas.
 *
 * Los recordatorios traen el estado (pagado/vencido) del mes REAL en curso sin
 * importar qué mes se mire: en otro mes solo se ubica el día de vencimiento y el
 * estado se descarta, para no mostrar como pagado algo de otro mes.
 *
 * `gastos` son las cuotas de tarjeta y los gastos con fecha: cada uno cae en su
 * propio día, en el mes que sea.
 */
export function celdasDelMes(
  mes: string,
  hoy: string,
  recordatorios: RecordatorioCalculado[],
  gastos: GastoAgendado[] = [],
): Celda[] {
  const [anio, m] = mes.split("-").map(Number);
  const total = diasDelMes(mes);
  const esMesReal = hoy.slice(0, 7) === mes;
  const festivos = new Map(festivosDelMes(mes).map((f) => [f.fecha, f]));

  const pagosPorDia = new Map<number, RecordatorioCalculado[]>();
  for (const rec of recordatorios) {
    if (!rec.activo) continue;
    // Un gasto programado solo aparece en su mes, y su estado es el suyo
    // (no el del mes en curso), así que se conserva al mirar otro mes.
    if (rec.fecha !== null && rec.fecha.slice(0, 7) !== mes) continue;
    const dia = Math.min(rec.dia, total);
    const lista = pagosPorDia.get(dia) ?? [];
    lista.push(esMesReal || rec.fecha !== null ? rec : { ...rec, pagado: false, vencido: false });
    pagosPorDia.set(dia, lista);
  }

  const gastosPorDia = new Map<number, GastoAgendado[]>();
  for (const g of gastos) {
    if (g.fecha.slice(0, 7) !== mes) continue;
    const dia = Number(g.fecha.slice(8, 10));
    gastosPorDia.set(dia, [...(gastosPorDia.get(dia) ?? []), g]);
  }

  // 0 = lunes … 6 = domingo
  const inicio = (new Date(Date.UTC(anio, m - 1, 1)).getUTCDay() + 6) % 7;
  const celdas: Celda[] = Array.from({ length: inicio }, () => null);

  for (let dia = 1; dia <= total; dia++) {
    const fecha = `${mes}-${String(dia).padStart(2, "0")}`;
    celdas.push({
      fecha,
      dia,
      esHoy: fecha === hoy,
      pasado: fecha < hoy,
      esDomingo: (inicio + dia - 1) % 7 === 6,
      festivo: festivos.get(fecha) ?? null,
      pagos: pagosPorDia.get(dia) ?? [],
      gastos: gastosPorDia.get(dia) ?? [],
    });
  }
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

export function resumenDelMes(celdas: Celda[]): ResumenMes {
  const resumen: ResumenMes = { pagos: 0, total: 0, festivos: 0, cuotas: 0, totalCuotas: 0, gastosAnotados: 0 };
  for (const c of celdas) {
    if (!c) continue;
    if (c.festivo) resumen.festivos++;
    resumen.pagos += c.pagos.length;
    resumen.total += c.pagos.reduce((s, p) => s + p.montoEstimado, 0);
    for (const g of c.gastos) {
      if (g.cuota !== null) {
        resumen.cuotas++;
        resumen.totalCuotas += g.monto;
      } else {
        resumen.gastosAnotados++;
      }
    }
  }
  return resumen;
}

/** ¿Tiene el día algo que mostrar además del número? */
export function diaConAgenda(c: DiaCalendario): boolean {
  return c.festivo !== null || c.pagos.length > 0 || c.gastos.length > 0;
}

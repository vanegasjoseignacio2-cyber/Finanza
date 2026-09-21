import { categoria, etiquetaCategoria } from "./categorias";
import { diasEntre, hoyISO, proximoVencimiento } from "./fechas";
import type {
  Ajustes,
  Movimiento,
  PuntoTendencia,
  Recordatorio,
  RecordatorioCalculado,
  Resumen,
  ResumenCategoria,
} from "./types";

/** Agrupa los gastos del mes por categoría, de mayor a menor. */
export function agruparPorCategoria(movimientos: Movimiento[]): ResumenCategoria[] {
  const totales = new Map<string, number>();
  for (const m of movimientos) {
    if (m.tipo !== "gasto") continue;
    totales.set(m.categoria, (totales.get(m.categoria) ?? 0) + m.monto);
  }
  const suma = [...totales.values()].reduce((a, b) => a + b, 0);
  return [...totales.entries()]
    .map(([cat, total]) => ({
      categoria: cat,
      total,
      porcentaje: suma ? Math.round((total / suma) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Resuelve el estado de cada recordatorio frente a la fecha de hoy.
 * Un recordatorio está pagado si se marcó a mano o si ya hay un gasto de esa
 * categoría en el mes en curso.
 */
export function calcularRecordatorios(
  recordatorios: Recordatorio[],
  movimientosDelMes: Movimiento[],
  hoy = hoyISO(),
): RecordatorioCalculado[] {
  const mes = hoy.slice(0, 7);
  const diaHoy = Number(hoy.slice(8, 10));
  const categoriasConGasto = new Set(
    movimientosDelMes.filter((m) => m.tipo === "gasto").map((m) => m.categoria),
  );

  return recordatorios
    .map((r) => {
      const pagado =
        r.pagados.includes(mes) ||
        (r.categoria !== "" && categoriasConGasto.has(r.categoria));
      const vencimiento = proximoVencimiento(r.dia, hoy);
      return {
        ...r,
        pagado,
        vencimiento,
        diasFaltantes: diasEntre(hoy, vencimiento),
        vencido: !pagado && diaHoy > r.dia,
      };
    })
    .sort((a, b) => {
      if (a.pagado !== b.pagado) return a.pagado ? 1 : -1;
      return a.diasFaltantes - b.diasFaltantes;
    });
}

/** Recordatorios que merecen un correo hoy: vencen dentro del margen de aviso. */
export function recordatoriosParaAvisar(
  calculados: RecordatorioCalculado[],
  diasAviso: number,
): RecordatorioCalculado[] {
  return calculados.filter(
    (r) => r.activo && !r.pagado && r.diasFaltantes <= diasAviso,
  );
}

interface DatosConsejos {
  ingresoTotal: number;
  gastado: number;
  disponible: number;
  ahorradoMes: number;
  ahorroTotal: number;
  metaAhorro: number;
  metaNombre: string;
  categorias: ResumenCategoria[];
  promedioAhorroMensual: number;
  mesesRestantes: number | null;
  cuotaSugerida?: number | null;
  mesesHastaLimite?: number | null;
  tendencia: PuntoTendencia[];
}

/**
 * Consejos derivados de los números reales del mes. Se ordenan de más urgente
 * a más general y se recortan para que el panel no se vuelva un muro de texto.
 */
export function generarConsejos(d: DatosConsejos): string[] {
  const consejos: string[] = [];
  const pct = (parte: number, total: number) =>
    total ? Math.round((parte / total) * 100) : 0;

  if (d.disponible < 0) {
    consejos.push(
      `Este mes gastaste ${pct(Math.abs(d.disponible), d.ingresoTotal)}% por encima de tu ingreso. Antes de aportar al ahorro, revisa qué categoría se disparó y ponle un tope para el mes que viene.`,
    );
  }

  const top = d.categorias[0];
  if (top && d.ingresoTotal > 0) {
    const parte = pct(top.total, d.ingresoTotal);
    if (parte >= 35) {
      consejos.push(
        `${etiquetaCategoria(top.categoria)} se lleva el ${parte}% de tu ingreso. Es tu palanca más grande: bajarla un 10% libera más plata que recortar tres categorías pequeñas.`,
      );
    }
  }

  const hormiga = d.categorias
    .filter((c) => ["almuerzo", "ocio", "suscripciones", "otros"].includes(c.categoria))
    .reduce((s, c) => s + c.total, 0);
  if (hormiga > 0 && d.ingresoTotal > 0 && pct(hormiga, d.ingresoTotal) >= 15) {
    consejos.push(
      `Los gastos hormiga (comida fuera, ocio, suscripciones, otros) suman ${pct(hormiga, d.ingresoTotal)}% de tu ingreso. Son los más fáciles de recortar sin cambiar tu vida.`,
    );
  }

  if (d.ahorradoMes === 0 && d.disponible > 0) {
    consejos.push(
      `Te queda disponible este mes y aún no registras aporte al ahorro. Aparta primero y gasta después: la meta no debería depender de lo que sobre al final.`,
    );
  }

  if (d.cuotaSugerida && d.mesesHastaLimite) {
    const alcanza = d.promedioAhorroMensual >= d.cuotaSugerida;
    consejos.push(
      alcanza
        ? `Para ${d.metaNombre} necesitas ${d.cuotaSugerida.toLocaleString("es-CO")} al mes y vas apartando ${Math.round(d.promedioAhorroMensual).toLocaleString("es-CO")}: a este ritmo llegas a tiempo.`
        : `Para ${d.metaNombre} en la fecha que pusiste harían falta ${d.cuotaSugerida.toLocaleString("es-CO")} al mes, y vas en ${Math.round(d.promedioAhorroMensual).toLocaleString("es-CO")}. O subes el aporte o mueves la fecha.`,
    );
  } else if (d.metaAhorro > 0) {
    const falta = Math.max(0, d.metaAhorro - d.ahorroTotal);
    if (falta === 0) {
      consejos.push(
        `Ya cubriste la meta de ${d.metaNombre}. Define la siguiente antes de que el excedente se diluya en gastos del día a día.`,
      );
    } else if (d.mesesRestantes !== null) {
      consejos.push(
        `A tu ritmo actual (${Math.round(d.promedioAhorroMensual).toLocaleString("es-CO")} al mes) llegas a ${d.metaNombre} en unos ${d.mesesRestantes} ${d.mesesRestantes === 1 ? "mes" : "meses"}. Subir el aporte un 15% te adelanta varios meses.`,
      );
    } else {
      consejos.push(
        `Para ${d.metaNombre} te faltan ${falta.toLocaleString("es-CO")}. Ponle fecha límite y divide el faltante entre los meses que quedan: eso te da una cuota mensual concreta.`,
      );
    }
  }

  const meses = d.tendencia.filter((p) => p.gastado > 0);
  if (meses.length >= 3) {
    const previos = meses.slice(0, -1);
    const promedio = previos.reduce((s, p) => s + p.gastado, 0) / previos.length;
    const actual = meses[meses.length - 1].gastado;
    if (promedio > 0 && actual > promedio * 1.2) {
      consejos.push(
        `Llevas ${pct(actual - promedio, promedio)}% más de gasto que tu promedio de los últimos meses. Vale la pena mirar qué cambió antes de que se vuelva el nuevo normal.`,
      );
    }
  }

  consejos.push(
    "Antes de una compra grande compara al menos dos vendedores o dos fechas: en compras de varios millones, un 5% de diferencia ya son cientos de miles de pesos.",
  );

  return consejos.slice(0, 4);
}

export { categoria };

export interface EntradaResumen {
  mes: string;
  hoy: string;
  ajustes: Ajustes;
  /** Movimientos del mes que se está mirando. */
  movimientos: Movimiento[];
  /** Movimientos del mes real: los recordatorios siempre se juzgan contra hoy. */
  movimientosMesReal: Movimiento[];
  recordatorios: Recordatorio[];
  /** Ahorro acumulado de todos los meses. */
  ahorroTotal: number;
  /** Cuántos meses distintos tuvieron aportes al ahorro. */
  mesesConAhorro: number;
  tendencia: PuntoTendencia[];
}

/**
 * Convierte los datos crudos en el resumen que consume el panel.
 * Es una función pura: toda la aritmética del panel se prueba desde aquí.
 */
export function componerResumen(entrada: EntradaResumen): Resumen {
  const { ajustes, movimientos } = entrada;

  const suma = (tipo: Movimiento["tipo"]) =>
    movimientos.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.monto, 0);

  const gastado = suma("gasto");
  const ahorradoMes = suma("ahorro");
  const ingresosExtra = suma("ingreso");

  const ingresoTotal = ajustes.ingresoMensual + ingresosExtra;
  // El ahorro sale del mismo bolsillo: se descuenta de lo disponible.
  const disponible = ingresoTotal - gastado - ahorradoMes;

  const categorias = agruparPorCategoria(movimientos);

  const promedioAhorroMensual =
    entrada.mesesConAhorro > 0 ? entrada.ahorroTotal / entrada.mesesConAhorro : 0;
  const falta = Math.max(0, ajustes.metaAhorro - entrada.ahorroTotal);
  const mesesRestantes =
    falta > 0
      ? promedioAhorroMensual > 0
        ? Math.ceil(falta / promedioAhorroMensual)
        : null
      : ajustes.metaAhorro > 0
        ? 0
        : null;

  // Si hay fecha límite, se traduce en una cuota mensual concreta.
  let mesesHastaLimite: number | null = null;
  let cuotaSugerida: number | null = null;
  if (ajustes.metaFechaLimite && falta > 0) {
    const dias = diasEntre(entrada.hoy, ajustes.metaFechaLimite);
    mesesHastaLimite = dias > 0 ? Math.max(1, Math.round(dias / 30.44)) : 0;
    cuotaSugerida = mesesHastaLimite > 0 ? Math.ceil(falta / mesesHastaLimite) : falta;
  }

  const progresoMeta = ajustes.metaAhorro
    ? Math.min(100, Math.round((entrada.ahorroTotal / ajustes.metaAhorro) * 100))
    : 0;

  const consejos = generarConsejos({
    ingresoTotal,
    gastado,
    disponible,
    ahorradoMes,
    ahorroTotal: entrada.ahorroTotal,
    metaAhorro: ajustes.metaAhorro,
    metaNombre: ajustes.metaNombre,
    categorias,
    promedioAhorroMensual,
    mesesRestantes,
    cuotaSugerida,
    mesesHastaLimite,
    tendencia: entrada.tendencia,
  });

  return {
    mes: entrada.mes,
    ingresoBase: ajustes.ingresoMensual,
    ingresosExtra,
    ingresoTotal,
    gastado,
    ahorradoMes,
    disponible,
    ahorroTotal: entrada.ahorroTotal,
    metaAhorro: ajustes.metaAhorro,
    metaNombre: ajustes.metaNombre,
    progresoMeta,
    mesesRestantes,
    mesesHastaLimite,
    cuotaSugerida,
    promedioAhorroMensual,
    categorias,
    tendencia: entrada.tendencia,
    movimientos,
    recordatorios: calcularRecordatorios(
      entrada.recordatorios,
      entrada.movimientosMesReal,
      entrada.hoy,
    ),
    ajustes,
    consejos,
  };
}

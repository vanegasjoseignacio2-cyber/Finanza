import type { ObjectId } from "mongodb";

export type TipoMovimiento = "gasto" | "ahorro" | "ingreso";

export interface Ajustes {
  ingresoMensual: number;
  metaAhorro: number;
  metaNombre: string;
  metaFechaLimite: string | null; // YYYY-MM-DD
  email: string;
  emailActivo: boolean;
  /** Enviar el correo diario aunque no haya recordatorios próximos. */
  enviarSiempre: boolean;
  /** Días de anticipación con los que se avisa un recordatorio. */
  diasAviso: number;
  actualizadoEn: string;
}

export interface MovimientoDoc {
  _id: ObjectId;
  tipo: TipoMovimiento;
  categoria: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
  mes: string; // YYYY-MM
  nota: string;
  creadoEn: string;
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  categoria: string;
  monto: number;
  fecha: string;
  mes: string;
  nota: string;
  creadoEn: string;
}

export interface RecordatorioDoc {
  _id: ObjectId;
  titulo: string;
  dia: number; // 1-31
  categoria: string;
  montoEstimado: number;
  activo: boolean;
  /** Meses (YYYY-MM) en los que ya se marcó como pagado. */
  pagados: string[];
  creadoEn: string;
}

export interface Recordatorio {
  id: string;
  titulo: string;
  dia: number;
  categoria: string;
  montoEstimado: number;
  activo: boolean;
  pagados: string[];
  creadoEn: string;
}

/** Recordatorio con el cálculo de vencimiento ya resuelto. */
export interface RecordatorioCalculado extends Recordatorio {
  diasFaltantes: number;
  vencimiento: string; // YYYY-MM-DD
  pagado: boolean;
  vencido: boolean;
}

export interface ResumenCategoria {
  categoria: string;
  total: number;
  porcentaje: number;
}

export interface PuntoTendencia {
  mes: string; // YYYY-MM
  etiqueta: string; // "sep"
  gastado: number;
  ahorrado: number;
}

export interface Resumen {
  mes: string;
  ingresoBase: number;
  ingresosExtra: number;
  ingresoTotal: number;
  gastado: number;
  ahorradoMes: number;
  disponible: number;
  ahorroTotal: number;
  metaAhorro: number;
  metaNombre: string;
  progresoMeta: number;
  mesesRestantes: number | null;
  /** Meses que quedan hasta la fecha límite de la meta, si la definiste. */
  mesesHastaLimite: number | null;
  /** Cuánto habría que apartar cada mes para llegar a tiempo. */
  cuotaSugerida: number | null;
  promedioAhorroMensual: number;
  categorias: ResumenCategoria[];
  tendencia: PuntoTendencia[];
  movimientos: Movimiento[];
  recordatorios: RecordatorioCalculado[];
  ajustes: Ajustes;
  consejos: string[];
}

import { ObjectId } from "mongodb";
import { getDb, movimientosCol, recordatoriosCol } from "./db";
import { componerResumen } from "./finanzas";
import { hoyISO, mesActual, mesCorto, sumarMeses } from "./fechas";
import type {
  Ajustes,
  Movimiento,
  MovimientoDoc,
  PuntoTendencia,
  Recordatorio,
  RecordatorioDoc,
  Resumen,
  TipoMovimiento,
} from "./types";

const AJUSTES_ID = "app";

export const AJUSTES_POR_DEFECTO: Ajustes = {
  ingresoMensual: 0,
  metaAhorro: 0,
  metaNombre: "Mi meta de ahorro",
  metaFechaLimite: null,
  email: process.env.REMINDER_EMAIL ?? "",
  emailActivo: true,
  enviarSiempre: false,
  diasAviso: 3,
  actualizadoEn: new Date().toISOString(),
};

export async function obtenerAjustes(): Promise<Ajustes> {
  const db = await getDb();
  const doc = await db
    .collection<{ _id: string } & Partial<Ajustes>>("ajustes")
    .findOne({ _id: AJUSTES_ID });
  if (!doc) return { ...AJUSTES_POR_DEFECTO };
  const { _id, ...resto } = doc;
  return { ...AJUSTES_POR_DEFECTO, ...resto };
}

export async function guardarAjustes(parcial: Partial<Ajustes>): Promise<Ajustes> {
  const db = await getDb();
  const actuales = await obtenerAjustes();
  const nuevos: Ajustes = {
    ...actuales,
    ...parcial,
    actualizadoEn: new Date().toISOString(),
  };
  await db
    .collection<{ _id: string } & Ajustes>("ajustes")
    .updateOne({ _id: AJUSTES_ID }, { $set: nuevos }, { upsert: true });
  return nuevos;
}

function aMovimiento(doc: MovimientoDoc): Movimiento {
  return {
    id: doc._id.toHexString(),
    tipo: doc.tipo,
    categoria: doc.categoria,
    monto: doc.monto,
    fecha: doc.fecha,
    mes: doc.mes,
    nota: doc.nota ?? "",
    creadoEn: doc.creadoEn,
  };
}

function aRecordatorio(doc: RecordatorioDoc): Recordatorio {
  return {
    id: doc._id.toHexString(),
    titulo: doc.titulo,
    dia: doc.dia,
    categoria: doc.categoria ?? "",
    montoEstimado: doc.montoEstimado ?? 0,
    activo: doc.activo !== false,
    pagados: doc.pagados ?? [],
    creadoEn: doc.creadoEn,
  };
}

export async function listarMovimientos(filtros: {
  mes?: string;
  tipo?: TipoMovimiento;
  categoria?: string;
  limite?: number;
}): Promise<Movimiento[]> {
  const col = await movimientosCol();
  const consulta: Record<string, unknown> = {};
  if (filtros.mes) consulta.mes = filtros.mes;
  if (filtros.tipo) consulta.tipo = filtros.tipo;
  if (filtros.categoria) consulta.categoria = filtros.categoria;
  const docs = await col
    .find(consulta)
    .sort({ fecha: -1, creadoEn: -1 })
    .limit(filtros.limite ?? 500)
    .toArray();
  return docs.map(aMovimiento);
}

export async function crearMovimiento(datos: {
  tipo: TipoMovimiento;
  categoria: string;
  monto: number;
  fecha: string;
  nota: string;
}): Promise<Movimiento> {
  const col = await movimientosCol();
  const doc: MovimientoDoc = {
    _id: new ObjectId(),
    tipo: datos.tipo,
    categoria: datos.categoria,
    monto: datos.monto,
    fecha: datos.fecha,
    mes: datos.fecha.slice(0, 7),
    nota: datos.nota,
    creadoEn: new Date().toISOString(),
  };
  await col.insertOne(doc);
  return aMovimiento(doc);
}

export async function eliminarMovimiento(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await movimientosCol();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}

export async function listarRecordatorios(): Promise<Recordatorio[]> {
  const col = await recordatoriosCol();
  const docs = await col.find({}).sort({ dia: 1 }).toArray();
  return docs.map(aRecordatorio);
}

export async function crearRecordatorio(datos: {
  titulo: string;
  dia: number;
  categoria: string;
  montoEstimado: number;
}): Promise<Recordatorio> {
  const col = await recordatoriosCol();
  const doc: RecordatorioDoc = {
    _id: new ObjectId(),
    titulo: datos.titulo,
    dia: datos.dia,
    categoria: datos.categoria,
    montoEstimado: datos.montoEstimado,
    activo: true,
    pagados: [],
    creadoEn: new Date().toISOString(),
  };
  await col.insertOne(doc);
  return aRecordatorio(doc);
}

export async function actualizarRecordatorio(
  id: string,
  cambios: Partial<Pick<Recordatorio, "titulo" | "dia" | "categoria" | "montoEstimado" | "activo">> & {
    marcarPagado?: string | null;
  },
): Promise<Recordatorio | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await recordatoriosCol();
  const { marcarPagado, ...resto } = cambios;
  const operacion: Record<string, unknown> = {};
  if (Object.keys(resto).length > 0) operacion.$set = resto;
  if (marcarPagado) operacion.$addToSet = { pagados: marcarPagado };
  if (marcarPagado === null) operacion.$set = { ...(resto as object), pagados: [] };

  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    operacion,
    { returnDocument: "after" },
  );
  return doc ? aRecordatorio(doc) : null;
}

/** Quita un mes de la lista de pagados (deshacer "marcar como pagado"). */
export async function desmarcarPago(id: string, mes: string): Promise<Recordatorio | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await recordatoriosCol();
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $pull: { pagados: mes } },
    { returnDocument: "after" },
  );
  return doc ? aRecordatorio(doc) : null;
}

export async function eliminarRecordatorio(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await recordatoriosCol();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}

/** Suma por tipo agrupada por mes, para la tendencia de los últimos meses. */
async function serieMensual(desde: string, hasta: string): Promise<PuntoTendencia[]> {
  const col = await movimientosCol();
  const filas = await col
    .aggregate<{ _id: { mes: string; tipo: TipoMovimiento }; total: number }>([
      { $match: { mes: { $gte: desde, $lte: hasta } } },
      { $group: { _id: { mes: "$mes", tipo: "$tipo" }, total: { $sum: "$monto" } } },
    ])
    .toArray();

  const puntos = new Map<string, PuntoTendencia>();
  let cursor = desde;
  while (cursor <= hasta) {
    puntos.set(cursor, { mes: cursor, etiqueta: mesCorto(cursor), gastado: 0, ahorrado: 0 });
    cursor = sumarMeses(cursor, 1);
  }
  for (const fila of filas) {
    const punto = puntos.get(fila._id.mes);
    if (!punto) continue;
    if (fila._id.tipo === "gasto") punto.gastado = fila.total;
    if (fila._id.tipo === "ahorro") punto.ahorrado = fila.total;
  }
  return [...puntos.values()];
}

async function totalPorTipo(tipo: TipoMovimiento): Promise<number> {
  const col = await movimientosCol();
  const [fila] = await col
    .aggregate<{ total: number }>([
      { $match: { tipo } },
      { $group: { _id: null, total: { $sum: "$monto" } } },
    ])
    .toArray();
  return fila?.total ?? 0;
}

/** Número de meses distintos en los que hubo aportes al ahorro. */
async function mesesConAhorro(): Promise<number> {
  const col = await movimientosCol();
  const meses = await col.distinct("mes", { tipo: "ahorro" });
  return meses.length;
}

export async function calcularResumen(mes = mesActual()): Promise<Resumen> {
  const hoy = hoyISO();
  const mesReal = hoy.slice(0, 7);

  const [ajustes, movimientos, recordatorios, ahorroTotal, meses, tendencia] =
    await Promise.all([
      obtenerAjustes(),
      listarMovimientos({ mes }),
      listarRecordatorios(),
      totalPorTipo("ahorro"),
      mesesConAhorro(),
      serieMensual(sumarMeses(mes, -5), mes),
    ]);

  return componerResumen({
    mes,
    hoy,
    ajustes,
    movimientos,
    // Los recordatorios siempre se calculan contra el mes real, no contra el
    // mes que se esté mirando en el panel.
    movimientosMesReal:
      mes === mesReal ? movimientos : await listarMovimientos({ mes: mesReal }),
    recordatorios,
    ahorroTotal,
    mesesConAhorro: meses,
    tendencia,
  });
}

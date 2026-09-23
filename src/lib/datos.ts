/**
 * Lectura y escritura en MongoDB. Aquí no se calcula nada del dominio: se trae
 * lo necesario y se entrega a las funciones puras de `finanzas.ts`.
 */
import { BSON, MongoServerError, ObjectId } from "mongodb";
import { crearCatalogo, slugCategoria, type Catalogo } from "./categorias";
import {
  colecciones,
  type AjustesDoc,
  type CuentaDoc,
  type MetaDoc,
  type MovimientoDoc,
  type RecordatorioDoc,
} from "./db";
import { hoyISO, mesActual, sumarMeses } from "./fechas";
import {
  componerResumen,
  cuentaPrincipal,
  type FilaMensual,
  type SumaAgrupada,
} from "./finanzas";
import type {
  Ajustes,
  CategoriaPersonal,
  Cuenta,
  Envio,
  EstadoEnvio,
  Meta,
  Movimiento,
  Presupuesto,
  Recordatorio,
  Resumen,
  TipoCuenta,
  TipoMovimiento,
  TramoSueldo,
} from "./types";
import { ErrorNoEncontrado, ErrorValidacion } from "./validacion";

const AJUSTES_ID = "app";
const ahora = () => new Date().toISOString();

function oid(id: string, que: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new ErrorNoEncontrado(`No encontramos ${que}.`);
  return new ObjectId(id);
}

function esDuplicado(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

/* ─── Ajustes y seguridad ────────────────────────────────────────────────── */

export const AJUSTES_POR_DEFECTO: Omit<Ajustes, "actualizadoEn"> = {
  sueldos: [],
  email: process.env.REMINDER_EMAIL ?? "",
  emailActivo: true,
  enviarSiempre: false,
  diasAviso: 3,
  respaldoSemanal: true,
};

async function leerAjustesDoc(): Promise<AjustesDoc | null> {
  return (await colecciones.ajustes()).findOne({ _id: AJUSTES_ID });
}

function normalizarAjustes(doc: AjustesDoc | null): Ajustes {
  // Modelo anterior: un único ingreso mensual. Se convierte en un tramo que
  // aplica desde siempre, así los meses viejos conservan su cifra.
  const sueldos =
    doc?.sueldos ??
    (doc?.ingresoMensual ? [{ desde: "2000-01", monto: doc.ingresoMensual }] : []);
  return {
    sueldos,
    email: doc?.email ?? AJUSTES_POR_DEFECTO.email,
    emailActivo: doc?.emailActivo ?? AJUSTES_POR_DEFECTO.emailActivo,
    enviarSiempre: doc?.enviarSiempre ?? AJUSTES_POR_DEFECTO.enviarSiempre,
    diasAviso: doc?.diasAviso ?? AJUSTES_POR_DEFECTO.diasAviso,
    respaldoSemanal: doc?.respaldoSemanal ?? AJUSTES_POR_DEFECTO.respaldoSemanal,
    actualizadoEn: doc?.actualizadoEn ?? ahora(),
  };
}

export async function obtenerAjustes(): Promise<Ajustes> {
  return normalizarAjustes(await leerAjustesDoc());
}

export async function guardarAjustes(
  parcial: Partial<Pick<Ajustes, "email" | "emailActivo" | "enviarSiempre" | "diasAviso" | "respaldoSemanal">>,
): Promise<Ajustes> {
  await (await colecciones.ajustes()).updateOne(
    { _id: AJUSTES_ID },
    { $set: { ...parcial, actualizadoEn: ahora() } },
    { upsert: true },
  );
  return obtenerAjustes();
}

async function guardarSueldos(sueldos: TramoSueldo[]): Promise<Ajustes> {
  const ordenados = [...sueldos].sort((a, b) => a.desde.localeCompare(b.desde));
  await (await colecciones.ajustes()).updateOne(
    { _id: AJUSTES_ID },
    { $set: { sueldos: ordenados, actualizadoEn: ahora() } },
    { upsert: true },
  );
  return obtenerAjustes();
}

/** Fija el sueldo desde un mes en adelante. Los meses anteriores no cambian. */
export async function fijarSueldo(desde: string, monto: number): Promise<Ajustes> {
  const actuales = (await obtenerAjustes()).sueldos.filter((t) => t.desde !== desde);
  return guardarSueldos([...actuales, { desde, monto }]);
}

export async function quitarTramoSueldo(desde: string): Promise<Ajustes> {
  const actuales = (await obtenerAjustes()).sueldos;
  if (!actuales.some((t) => t.desde === desde)) {
    throw new ErrorNoEncontrado("Ese tramo de sueldo no existe.");
  }
  return guardarSueldos(actuales.filter((t) => t.desde !== desde));
}

export interface Seguridad {
  sesionVersion: number;
  claveHash: string | null;
}

export async function obtenerSeguridad(): Promise<Seguridad> {
  const doc = await leerAjustesDoc();
  return { sesionVersion: doc?.sesionVersion ?? 0, claveHash: doc?.claveHash ?? null };
}

/** Invalida todas las sesiones abiertas. Devuelve la versión nueva. */
export async function incrementarVersionSesion(claveHash?: string): Promise<number> {
  const doc = await (await colecciones.ajustes()).findOneAndUpdate(
    { _id: AJUSTES_ID },
    {
      $inc: { sesionVersion: 1 },
      $set: { actualizadoEn: ahora(), ...(claveHash ? { claveHash } : {}) },
    },
    { upsert: true, returnDocument: "after" },
  );
  return doc?.sesionVersion ?? 1;
}

/* ─── Categorías ─────────────────────────────────────────────────────────── */

export async function listarCategoriasPersonales(): Promise<CategoriaPersonal[]> {
  const docs = await (await colecciones.categorias()).find({}).toArray();
  return docs.map(({ _id, ...resto }) => ({ id: _id, ...resto }));
}

export async function obtenerCatalogo(): Promise<Catalogo> {
  return crearCatalogo(await listarCategoriasPersonales());
}

export async function crearCategoria(datos: {
  label: string;
  icono: string;
  tipo: "gasto" | "ingreso";
}): Promise<CategoriaPersonal> {
  const id = slugCategoria(datos.label);
  if (!id) throw new ErrorValidacion("El nombre de la categoría no es válido.");
  const catalogo = await obtenerCatalogo();
  if (catalogo.existe(id)) throw new ErrorValidacion("Ya existe una categoría con ese nombre.");
  const doc = { _id: id, label: datos.label, icono: datos.icono, tipo: datos.tipo, oculta: false };
  await (await colecciones.categorias()).insertOne(doc);
  return { id, label: doc.label, icono: doc.icono, tipo: doc.tipo, oculta: false };
}

/** Renombra, cambia el icono u oculta. Sirve también para las categorías base. */
export async function actualizarCategoria(
  id: string,
  cambios: { label?: string; icono?: string; oculta?: boolean },
): Promise<void> {
  const catalogo = await obtenerCatalogo();
  if (!catalogo.existe(id)) throw new ErrorNoEncontrado("No encontramos esa categoría.");
  const actual = catalogo.obtener(id);
  const tipo = actual.tipo === "ingreso" ? "ingreso" : "gasto";
  // $setOnInsert solo con los campos que $set no toca: Mongo rechaza que ambos
  // escriban el mismo campo.
  const alInsertar: Record<string, unknown> = { tipo };
  if (cambios.label === undefined) alInsertar.label = actual.label;
  if (cambios.icono === undefined) alInsertar.icono = actual.icono;
  if (cambios.oculta === undefined) alInsertar.oculta = false;
  await (await colecciones.categorias()).updateOne(
    { _id: id },
    { $set: { ...cambios }, $setOnInsert: alInsertar },
    { upsert: true },
  );
}

/* ─── Cuentas ────────────────────────────────────────────────────────────── */

function aCuenta(doc: CuentaDoc): Cuenta {
  return {
    id: doc._id.toHexString(),
    nombre: doc.nombre,
    tipo: doc.tipo,
    saldoInicial: doc.saldoInicial ?? 0,
    archivada: doc.archivada ?? false,
    creadoEn: doc.creadoEn,
  };
}

/** Todas las cuentas. Si no hay ninguna crea la principal, que recibe lo antiguo. */
export async function listarCuentas(): Promise<Cuenta[]> {
  const col = await colecciones.cuentas();
  if ((await col.estimatedDocumentCount()) === 0) {
    await col.updateOne(
      { predeterminada: true },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          nombre: "Principal",
          tipo: "corriente" as TipoCuenta,
          saldoInicial: 0,
          archivada: false,
          predeterminada: true,
          creadoEn: ahora(),
        },
      },
      { upsert: true },
    );
  }
  const docs = await col.find({}).sort({ creadoEn: 1 }).toArray();
  return docs.map(aCuenta);
}

export async function crearCuenta(datos: {
  nombre: string;
  tipo: TipoCuenta;
  saldoInicial: number;
}): Promise<Cuenta> {
  await listarCuentas();
  const doc: CuentaDoc = { _id: new ObjectId(), ...datos, archivada: false, creadoEn: ahora() };
  await (await colecciones.cuentas()).insertOne(doc);
  return aCuenta(doc);
}

export async function actualizarCuenta(
  id: string,
  cambios: Partial<Pick<Cuenta, "nombre" | "tipo" | "saldoInicial" | "archivada">>,
): Promise<Cuenta> {
  if (cambios.archivada) {
    const activas = (await listarCuentas()).filter((c) => !c.archivada && c.id !== id);
    if (activas.length === 0) {
      throw new ErrorValidacion("Necesitas al menos una cuenta activa.");
    }
  }
  const doc = await (await colecciones.cuentas()).findOneAndUpdate(
    { _id: oid(id, "esa cuenta") },
    { $set: cambios },
    { returnDocument: "after" },
  );
  if (!doc) throw new ErrorNoEncontrado("No encontramos esa cuenta.");
  return aCuenta(doc);
}

/* ─── Metas ──────────────────────────────────────────────────────────────── */

function aMeta(doc: MetaDoc): Meta {
  return {
    id: doc._id.toHexString(),
    nombre: doc.nombre,
    monto: doc.monto,
    fechaLimite: doc.fechaLimite ?? null,
    cuentaId: doc.cuentaId ?? null,
    principal: doc.principal ?? false,
    archivada: doc.archivada ?? false,
    creadoEn: doc.creadoEn,
  };
}

/** Todas las metas. La primera vez convierte la meta única del modelo anterior. */
export async function listarMetas(): Promise<Meta[]> {
  const col = await colecciones.metas();
  if ((await col.estimatedDocumentCount()) === 0) {
    const legado = await leerAjustesDoc();
    if (legado?.metaAhorro && legado.metaAhorro > 0) {
      await col.updateOne(
        { legado: true },
        {
          $setOnInsert: {
            _id: new ObjectId(),
            nombre: legado.metaNombre || "Mi meta de ahorro",
            monto: legado.metaAhorro,
            fechaLimite: legado.metaFechaLimite ?? null,
            cuentaId: null,
            principal: true,
            archivada: false,
            legado: true,
            creadoEn: ahora(),
          },
        },
        { upsert: true },
      );
    }
  }
  const docs = await col.find({}).sort({ creadoEn: 1 }).toArray();
  return docs.map(aMeta);
}

export async function crearMeta(datos: {
  nombre: string;
  monto: number;
  fechaLimite: string | null;
  cuentaId: string | null;
}): Promise<Meta> {
  const existentes = await listarMetas();
  if (datos.cuentaId) await exigirCuenta(datos.cuentaId);
  const doc: MetaDoc = {
    _id: new ObjectId(),
    ...datos,
    principal: !existentes.some((m) => m.principal && !m.archivada),
    archivada: false,
    creadoEn: ahora(),
  };
  await (await colecciones.metas()).insertOne(doc);
  return aMeta(doc);
}

export async function actualizarMeta(
  id: string,
  cambios: Partial<Pick<Meta, "nombre" | "monto" | "fechaLimite" | "cuentaId" | "archivada">>,
): Promise<Meta> {
  if (cambios.cuentaId) await exigirCuenta(cambios.cuentaId);
  const doc = await (await colecciones.metas()).findOneAndUpdate(
    { _id: oid(id, "esa meta") },
    { $set: cambios },
    { returnDocument: "after" },
  );
  if (!doc) throw new ErrorNoEncontrado("No encontramos esa meta.");
  return aMeta(doc);
}

/* ─── Presupuestos ───────────────────────────────────────────────────────── */

export async function listarPresupuestos(): Promise<Presupuesto[]> {
  const docs = await (await colecciones.presupuestos()).find({}).toArray();
  return docs.map((d) => ({ categoria: d._id, tope: d.tope }));
}

/** Fija el tope mensual de una categoría. Con 0 lo quita. */
export async function fijarPresupuesto(categoria: string, tope: number): Promise<void> {
  const catalogo = await obtenerCatalogo();
  if (!catalogo.existe(categoria, "gasto")) {
    throw new ErrorValidacion("Solo se pueden presupuestar categorías de gasto.");
  }
  const col = await colecciones.presupuestos();
  if (tope <= 0) {
    await col.deleteOne({ _id: categoria });
  } else {
    await col.updateOne({ _id: categoria }, { $set: { tope } }, { upsert: true });
  }
}

/* ─── Movimientos ────────────────────────────────────────────────────────── */

function aMovimiento(doc: MovimientoDoc, principalId: string): Movimiento {
  return {
    id: doc._id.toHexString(),
    tipo: doc.tipo,
    categoria: doc.categoria,
    monto: doc.monto,
    fecha: doc.fecha,
    mes: doc.mes,
    nota: doc.nota ?? "",
    cuentaId: doc.cuentaId ?? principalId,
    cuentaDestinoId: doc.cuentaDestinoId ?? null,
    metaId: doc.metaId ?? null,
    recurrenteId: doc.recurrenteId ?? null,
    creadoEn: doc.creadoEn,
  };
}

async function idPrincipal(): Promise<string> {
  return cuentaPrincipal(await listarCuentas())?.id ?? "";
}

async function exigirCuenta(id: string): Promise<Cuenta> {
  const cuenta = (await listarCuentas()).find((c) => c.id === id);
  if (!cuenta) throw new ErrorValidacion("La cuenta elegida no existe.");
  return cuenta;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface FiltrosMovimientos {
  mes?: string;
  tipo?: TipoMovimiento;
  categoria?: string;
  cuentaId?: string;
  /** Busca en la nota y en el nombre de la categoría, en todos los meses. */
  q?: string;
  limite?: number;
}

export async function listarMovimientos(filtros: FiltrosMovimientos = {}): Promise<Movimiento[]> {
  const principalId = await idPrincipal();
  const condiciones: Record<string, unknown>[] = [];

  if (filtros.mes && !filtros.q) condiciones.push({ mes: filtros.mes });
  if (filtros.tipo) condiciones.push({ tipo: filtros.tipo });
  if (filtros.categoria) condiciones.push({ categoria: filtros.categoria });
  if (filtros.cuentaId) {
    const propias: Record<string, unknown>[] = [
      { cuentaId: filtros.cuentaId },
      { cuentaDestinoId: filtros.cuentaId },
    ];
    // Lo antiguo sin cuenta pertenece a la principal.
    if (filtros.cuentaId === principalId) propias.push({ cuentaId: null });
    condiciones.push({ $or: propias });
  }
  if (filtros.q) {
    const patron = new RegExp(escaparRegex(filtros.q.trim()), "i");
    const catalogo = await obtenerCatalogo();
    const categorias = catalogo.lista.filter((c) => patron.test(c.label)).map((c) => c.id);
    condiciones.push({ $or: [{ nota: patron }, { categoria: { $in: categorias } }] });
  }

  const docs = await (await colecciones.movimientos())
    .find(condiciones.length ? { $and: condiciones } : {})
    .sort({ fecha: -1, creadoEn: -1 })
    .limit(filtros.limite ?? 500)
    .toArray();
  return docs.map((d) => aMovimiento(d, principalId));
}

export async function obtenerMovimiento(id: string): Promise<Movimiento> {
  const doc = await (await colecciones.movimientos()).findOne({ _id: oid(id, "ese movimiento") });
  if (!doc) throw new ErrorNoEncontrado("No encontramos ese movimiento.");
  return aMovimiento(doc, await idPrincipal());
}

export interface DatosMovimiento {
  tipo: TipoMovimiento;
  monto: number;
  fecha: string;
  nota: string;
  categoria?: string;
  cuentaId?: string | null;
  cuentaDestinoId?: string | null;
  metaId?: string | null;
  recurrenteId?: string | null;
}

/**
 * Valida contra lo que existe y completa lo que se deduce: la categoría de
 * aportes, retiros y transferencias, y la cuenta de la meta.
 */
async function prepararMovimiento(
  d: DatosMovimiento,
): Promise<Omit<MovimientoDoc, "_id" | "creadoEn">> {
  const [catalogo, cuentas] = await Promise.all([obtenerCatalogo(), listarCuentas()]);
  const cuentaId = d.cuentaId || cuentaPrincipal(cuentas)?.id;
  if (!cuentaId || !cuentas.some((c) => c.id === cuentaId)) {
    throw new ErrorValidacion("La cuenta elegida no existe.");
  }

  const base = {
    tipo: d.tipo,
    monto: d.monto,
    fecha: d.fecha,
    mes: d.fecha.slice(0, 7),
    nota: d.nota,
    cuentaId,
    cuentaDestinoId: null as string | null,
    metaId: null as string | null,
    recurrenteId: null as string | null,
  };

  switch (d.tipo) {
    case "gasto": {
      if (!d.categoria || !catalogo.existe(d.categoria, "gasto")) {
        throw new ErrorValidacion("Selecciona una categoría de gasto válida.");
      }
      if (d.recurrenteId) {
        const existe = await (await colecciones.recordatorios()).countDocuments({
          _id: oid(d.recurrenteId, "ese pago fijo"),
        });
        if (!existe) throw new ErrorValidacion("El pago fijo vinculado no existe.");
      }
      return { ...base, categoria: d.categoria, recurrenteId: d.recurrenteId ?? null };
    }
    case "ingreso": {
      if (!d.categoria || !catalogo.existe(d.categoria, "ingreso")) {
        throw new ErrorValidacion("Selecciona una categoría de ingreso válida.");
      }
      return { ...base, categoria: d.categoria };
    }
    case "ahorro":
    case "retiro": {
      const meta = (await listarMetas()).find((m) => m.id === d.metaId);
      if (!meta) throw new ErrorValidacion("Elige la meta a la que va este movimiento.");
      return {
        ...base,
        categoria: d.tipo,
        metaId: meta.id,
        cuentaDestinoId: meta.cuentaId && meta.cuentaId !== cuentaId ? meta.cuentaId : null,
      };
    }
    case "transferencia": {
      if (!d.cuentaDestinoId || !cuentas.some((c) => c.id === d.cuentaDestinoId)) {
        throw new ErrorValidacion("Elige la cuenta de destino.");
      }
      if (d.cuentaDestinoId === cuentaId) {
        throw new ErrorValidacion("La cuenta de origen y la de destino deben ser distintas.");
      }
      return { ...base, categoria: "transferencia", cuentaDestinoId: d.cuentaDestinoId };
    }
  }
}

export async function crearMovimiento(datos: DatosMovimiento): Promise<Movimiento> {
  const listo = await prepararMovimiento(datos);
  const doc: MovimientoDoc = { _id: new ObjectId(), ...listo, creadoEn: ahora() };
  await (await colecciones.movimientos()).insertOne(doc);
  return aMovimiento(doc, await idPrincipal());
}

export async function actualizarMovimiento(id: string, datos: DatosMovimiento): Promise<Movimiento> {
  const listo = await prepararMovimiento(datos);
  const doc = await (await colecciones.movimientos()).findOneAndUpdate(
    { _id: oid(id, "ese movimiento") },
    { $set: listo },
    { returnDocument: "after" },
  );
  if (!doc) throw new ErrorNoEncontrado("No encontramos ese movimiento.");
  return aMovimiento(doc, await idPrincipal());
}

export async function eliminarMovimiento(id: string): Promise<void> {
  const res = await (await colecciones.movimientos()).deleteOne({ _id: oid(id, "ese movimiento") });
  if (res.deletedCount !== 1) throw new ErrorNoEncontrado("No encontramos ese movimiento.");
}

/* ─── Pagos fijos (recordatorios) ────────────────────────────────────────── */

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

export async function listarRecordatorios(): Promise<Recordatorio[]> {
  const docs = await (await colecciones.recordatorios()).find({}).sort({ dia: 1 }).toArray();
  return docs.map(aRecordatorio);
}

async function validarCategoriaRecordatorio(categoria: string): Promise<void> {
  if (categoria && !(await obtenerCatalogo()).existe(categoria, "gasto")) {
    throw new ErrorValidacion("La categoría del pago fijo no es válida.");
  }
}

export async function crearRecordatorio(datos: {
  titulo: string;
  dia: number;
  categoria: string;
  montoEstimado: number;
}): Promise<Recordatorio> {
  await validarCategoriaRecordatorio(datos.categoria);
  const doc: RecordatorioDoc = {
    _id: new ObjectId(),
    ...datos,
    activo: true,
    pagados: [],
    creadoEn: ahora(),
  };
  await (await colecciones.recordatorios()).insertOne(doc);
  return aRecordatorio(doc);
}

export async function actualizarRecordatorio(
  id: string,
  cambios: Partial<Pick<Recordatorio, "titulo" | "dia" | "categoria" | "montoEstimado" | "activo">>,
): Promise<Recordatorio> {
  if (cambios.categoria !== undefined) await validarCategoriaRecordatorio(cambios.categoria);
  const doc = await (await colecciones.recordatorios()).findOneAndUpdate(
    { _id: oid(id, "ese pago fijo") },
    { $set: cambios },
    { returnDocument: "after" },
  );
  if (!doc) throw new ErrorNoEncontrado("No encontramos ese pago fijo.");
  return aRecordatorio(doc);
}

/** Marca o desmarca un mes como pagado sin registrar gasto. */
export async function marcarPagoManual(id: string, mes: string, pagado: boolean): Promise<Recordatorio> {
  const doc = await (await colecciones.recordatorios()).findOneAndUpdate(
    { _id: oid(id, "ese pago fijo") },
    pagado ? { $addToSet: { pagados: mes } } : { $pull: { pagados: mes } },
    { returnDocument: "after" },
  );
  if (!doc) throw new ErrorNoEncontrado("No encontramos ese pago fijo.");
  return aRecordatorio(doc);
}

/** Registra el pago: crea el gasto vinculado, que es lo que lo da por pagado. */
export async function pagarRecordatorio(
  id: string,
  datos: { monto: number; fecha: string; cuentaId: string | null; nota: string },
): Promise<Movimiento> {
  const doc = await (await colecciones.recordatorios()).findOne({ _id: oid(id, "ese pago fijo") });
  if (!doc) throw new ErrorNoEncontrado("No encontramos ese pago fijo.");
  const mes = datos.fecha.slice(0, 7);
  const yaPagado = await (await colecciones.movimientos()).countDocuments({ recurrenteId: id, mes });
  if (yaPagado) throw new ErrorValidacion("Ese pago ya está registrado este mes.");
  return crearMovimiento({
    tipo: "gasto",
    categoria: doc.categoria || "otros",
    monto: datos.monto,
    fecha: datos.fecha,
    nota: datos.nota || doc.titulo,
    cuentaId: datos.cuentaId,
    recurrenteId: id,
  });
}

/** Deshace el pago de un mes: borra el gasto vinculado y la marca manual. */
export async function deshacerPago(id: string, mes: string): Promise<void> {
  await Promise.all([
    (await colecciones.movimientos()).deleteMany({ recurrenteId: id, mes }),
    marcarPagoManual(id, mes, false),
  ]);
}

export async function eliminarRecordatorio(id: string): Promise<void> {
  const res = await (await colecciones.recordatorios()).deleteOne({ _id: oid(id, "ese pago fijo") });
  if (res.deletedCount !== 1) throw new ErrorNoEncontrado("No encontramos ese pago fijo.");
  // Los gastos ya registrados se conservan; solo pierden el vínculo.
  await (await colecciones.movimientos()).updateMany({ recurrenteId: id }, { $set: { recurrenteId: null } });
}

/* ─── Agregados ──────────────────────────────────────────────────────────── */

/** Sumas de toda la historia, agrupadas por lo que afecta a saldos y metas. */
export async function sumasHistoricas(): Promise<SumaAgrupada[]> {
  const filas = await (await colecciones.movimientos())
    .aggregate<{
      _id: { tipo: TipoMovimiento; cuentaId: string | null; cuentaDestinoId: string | null; metaId: string | null };
      total: number;
      primerMes: string;
    }>([
      {
        $group: {
          _id: {
            tipo: "$tipo",
            cuentaId: { $ifNull: ["$cuentaId", null] },
            cuentaDestinoId: { $ifNull: ["$cuentaDestinoId", null] },
            metaId: { $ifNull: ["$metaId", null] },
          },
          total: { $sum: "$monto" },
          primerMes: { $min: "$mes" },
        },
      },
    ])
    .toArray();
  return filas.map((f) => ({ ...f._id, total: f.total, primerMes: f.primerMes }));
}

export async function serieMensual(desde: string, hasta: string): Promise<FilaMensual[]> {
  const filas = await (await colecciones.movimientos())
    .aggregate<{ _id: { mes: string; tipo: TipoMovimiento; categoria: string }; total: number }>([
      { $match: { mes: { $gte: desde, $lte: hasta } } },
      { $group: { _id: { mes: "$mes", tipo: "$tipo", categoria: "$categoria" }, total: { $sum: "$monto" } } },
    ])
    .toArray();
  return filas.map((f) => ({ ...f._id, total: f.total }));
}

export async function calcularResumen(mes = mesActual()): Promise<Resumen> {
  const hoy = hoyISO();
  const mesReal = hoy.slice(0, 7);
  const [ajustes, movimientosMes, movimientosMesReal, recordatorios, metas, cuentas, presupuestos, sumas, serie, catalogo] =
    await Promise.all([
      obtenerAjustes(),
      listarMovimientos({ mes }),
      mes === mesReal ? Promise.resolve(null) : listarMovimientos({ mes: mesReal }),
      listarRecordatorios(),
      listarMetas(),
      listarCuentas(),
      listarPresupuestos(),
      sumasHistoricas(),
      serieMensual(sumarMeses(mes, -5), mes),
      obtenerCatalogo(),
    ]);

  return componerResumen({
    mes,
    hoy,
    ajustes,
    movimientosMes,
    movimientosMesReal: movimientosMesReal ?? movimientosMes,
    recordatorios,
    metas,
    cuentas,
    presupuestos,
    sumas,
    serie,
    catalogo,
  });
}

/* ─── Registro de envíos del correo ──────────────────────────────────────── */

const ENVIO_ABANDONADO_MS = 10 * 60 * 1000;

/**
 * Reserva el envío de un día de forma atómica. Solo una llamada puede ganar:
 * si dos disparos llegan a la vez, el segundo encuentra la reserva y se retira.
 * Se puede volver a intentar un día que falló, se omitió o quedó colgado.
 */
export async function reservarEnvio(fecha: string): Promise<boolean> {
  const col = await colecciones.envios();
  try {
    await col.insertOne({ _id: fecha, estado: "enviando", intentoEn: new Date() });
    return true;
  } catch (error) {
    if (!esDuplicado(error)) throw error;
  }
  const retomado = await col.findOneAndUpdate(
    {
      _id: fecha,
      $or: [
        { estado: { $in: ["error", "omitido"] as EstadoEnvio[] } },
        { estado: "enviando", intentoEn: { $lt: new Date(Date.now() - ENVIO_ABANDONADO_MS) } },
      ],
    },
    { $set: { estado: "enviando", intentoEn: new Date() }, $unset: { error: "", motivo: "" } },
    { returnDocument: "after" },
  );
  return retomado !== null;
}

export async function cerrarEnvio(
  fecha: string,
  datos: {
    estado: "enviado" | "error";
    destinatario?: string;
    asunto?: string;
    error?: string;
    avisos?: number;
    respaldo?: boolean;
  },
): Promise<void> {
  await (await colecciones.envios()).updateOne({ _id: fecha }, { $set: { ...datos } });
}

/** Deja constancia de que hoy no hacía falta correo, sin pisar uno ya enviado. */
export async function registrarOmitido(fecha: string, motivo: string): Promise<void> {
  try {
    await (await colecciones.envios()).updateOne(
      { _id: fecha, estado: { $ne: "enviado" } },
      { $set: { estado: "omitido", motivo, intentoEn: new Date() } },
      { upsert: true },
    );
  } catch (error) {
    // El filtro no casa con un día ya enviado y el upsert choca con su _id: correcto.
    if (!esDuplicado(error)) throw error;
  }
}

export async function listarEnvios(limite = 10): Promise<Envio[]> {
  const docs = await (await colecciones.envios()).find({}).sort({ _id: -1 }).limit(limite).toArray();
  return docs.map(({ _id, intentoEn, ...resto }) => ({
    fecha: _id,
    intentoEn: intentoEn.toISOString(),
    ...resto,
  }));
}

/* ─── Límite de intentos de acceso ───────────────────────────────────────── */

export const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

export async function bloqueadoHasta(clave: string): Promise<Date | null> {
  const doc = await (await colecciones.intentos()).findOne({ _id: clave });
  return doc?.bloqueadoHasta && doc.bloqueadoHasta > new Date() ? doc.bloqueadoHasta : null;
}

/** Suma un fallo; al quinto dentro de 15 minutos bloquea otros 15. */
export async function registrarFallo(clave: string): Promise<Date | null> {
  const col = await colecciones.intentos();
  const ahoraMs = Date.now();
  const doc = await col.findOne({ _id: clave });
  const vigente = doc && ahoraMs - doc.desde.getTime() < VENTANA_MS;
  const fallos = vigente ? doc.fallos + 1 : 1;
  const bloqueo = fallos >= MAX_FALLOS ? new Date(ahoraMs + VENTANA_MS) : null;
  await col.updateOne(
    { _id: clave },
    { $set: { fallos, desde: vigente ? doc.desde : new Date(ahoraMs), bloqueadoHasta: bloqueo } },
    { upsert: true },
  );
  return bloqueo;
}

export async function limpiarIntentos(clave: string): Promise<void> {
  await (await colecciones.intentos()).deleteOne({ _id: clave });
}

/* ─── Respaldo ───────────────────────────────────────────────────────────── */

export const COLECCIONES_RESPALDO = [
  "movimientos",
  "recordatorios",
  "cuentas",
  "metas",
  "presupuestos",
  "categorias",
  "ajustes",
] as const;

/**
 * Todo lo necesario para reconstruir la app, en Extended JSON (conserva los
 * ObjectId). Excluye la clave y la versión de sesión: un respaldo en el correo
 * no debe servir para entrar.
 */
export async function exportarRespaldo(): Promise<string> {
  const datos: Record<string, unknown[]> = {};
  for (const nombre of COLECCIONES_RESPALDO) {
    const docs = await (await colecciones[nombre]()).find({}).toArray();
    datos[nombre] =
      nombre === "ajustes"
        ? docs.map((d) => {
            const { claveHash: _c, sesionVersion: _v, ...resto } = d as AjustesDoc;
            return resto;
          })
        : docs;
  }
  return BSON.EJSON.stringify(
    { formato: "finanza-respaldo", version: 1, generadoEn: ahora(), colecciones: datos },
    { relaxed: false },
  );
}

import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";
import type {
  Ajustes,
  CategoriaPersonal,
  EstadoEnvio,
  TipoCuenta,
  TipoMovimiento,
} from "./types";

/* ─── Documentos tal como se guardan ─────────────────────────────────────── */

export interface MovimientoDoc {
  _id: ObjectId;
  tipo: TipoMovimiento;
  categoria: string;
  monto: number;
  fecha: string;
  mes: string;
  nota: string;
  // Los documentos anteriores al modelo de cuentas no tienen estos campos.
  cuentaId?: string | null;
  cuentaDestinoId?: string | null;
  metaId?: string | null;
  recurrenteId?: string | null;
  creadoEn: string;
}

export interface RecordatorioDoc {
  _id: ObjectId;
  titulo: string;
  dia: number;
  categoria: string;
  montoEstimado: number;
  activo: boolean;
  pagados: string[];
  creadoEn: string;
}

export interface CuentaDoc {
  _id: ObjectId;
  nombre: string;
  tipo: TipoCuenta;
  saldoInicial: number;
  archivada: boolean;
  predeterminada?: boolean;
  creadoEn: string;
}

export interface MetaDoc {
  _id: ObjectId;
  nombre: string;
  monto: number;
  fechaLimite: string | null;
  cuentaId: string | null;
  principal: boolean;
  archivada: boolean;
  legado?: boolean;
  creadoEn: string;
}

export interface PresupuestoDoc {
  _id: string; // categoría
  tope: number;
}

export type CategoriaDoc = Omit<CategoriaPersonal, "id"> & { _id: string };

/** Ajustes más los campos del modelo anterior, que se migran al leer. */
export interface AjustesDoc extends Partial<Ajustes> {
  _id: string;
  sesionVersion?: number;
  claveHash?: string | null;
  // Legado
  ingresoMensual?: number;
  metaAhorro?: number;
  metaNombre?: string;
  metaFechaLimite?: string | null;
}

export interface EnvioDoc {
  _id: string; // fecha YYYY-MM-DD
  estado: EstadoEnvio;
  intentoEn: Date;
  destinatario?: string;
  asunto?: string;
  error?: string;
  motivo?: string;
  avisos?: number;
  respaldo?: boolean;
}

export interface IntentoDoc {
  _id: string; // hash de la IP
  fallos: number;
  desde: Date;
  bloqueadoHasta: Date | null;
}

/* ─── Conexión ───────────────────────────────────────────────────────────── */

// En desarrollo el hot reload recrea los módulos: se cachea el cliente en
// global para no abrir una conexión nueva en cada recarga.
const globalMongo = globalThis as unknown as {
  _finanzaMongo?: Promise<MongoClient>;
  _finanzaIndices?: Promise<void>;
};

function crearCliente(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // La comprobación es perezosa a propósito: así `next build` no falla por
    // falta de credenciales, solo la petición que de verdad necesita la base.
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Copia .env.example a .env.local y pega tu cadena de conexión de MongoDB Atlas.",
    );
  }
  return new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  }).connect();
}

async function asegurarIndices(db: Db): Promise<void> {
  await Promise.all([
    db.collection("movimientos").createIndex({ mes: -1, fecha: -1 }),
    db.collection("movimientos").createIndex({ tipo: 1, mes: 1 }),
    db.collection("movimientos").createIndex({ recurrenteId: 1, mes: 1 }, { sparse: true }),
    db.collection("recordatorios").createIndex({ dia: 1 }),
    // Únicos parciales: si dos peticiones crean a la vez la cuenta principal o
    // migran la meta antigua, el servidor reintenta el upsert en vez de duplicar.
    db.collection("cuentas").createIndex(
      { predeterminada: 1 },
      { unique: true, partialFilterExpression: { predeterminada: true } },
    ),
    db.collection("metas").createIndex(
      { legado: 1 },
      { unique: true, partialFilterExpression: { legado: true } },
    ),
  ]);
}

export async function getDb(): Promise<Db> {
  globalMongo._finanzaMongo ??= crearCliente();
  const client = await globalMongo._finanzaMongo;
  // El nombre se lee en cada llamada: las pruebas de integración usan otra base.
  const db = client.db(process.env.MONGODB_DB || "finanza");
  globalMongo._finanzaIndices ??= asegurarIndices(db).catch((error) => {
    // Los índices son una optimización: si el usuario de Atlas no puede
    // crearlos, la app sigue funcionando.
    console.error("No se pudieron crear los índices de MongoDB:", error);
  });
  await globalMongo._finanzaIndices;
  return db;
}

/** Cierra la conexión compartida (lo usan las pruebas al terminar). */
export async function cerrarConexion(): Promise<void> {
  const pendiente = globalMongo._finanzaMongo;
  globalMongo._finanzaMongo = undefined;
  globalMongo._finanzaIndices = undefined;
  if (pendiente) await (await pendiente).close();
}

async function col<T extends object>(nombre: string): Promise<Collection<T>> {
  return (await getDb()).collection<T>(nombre);
}

export const colecciones = {
  movimientos: () => col<MovimientoDoc>("movimientos"),
  recordatorios: () => col<RecordatorioDoc>("recordatorios"),
  cuentas: () => col<CuentaDoc>("cuentas"),
  metas: () => col<MetaDoc>("metas"),
  presupuestos: () => col<PresupuestoDoc>("presupuestos"),
  categorias: () => col<CategoriaDoc>("categorias"),
  ajustes: () => col<AjustesDoc>("ajustes"),
  envios: () => col<EnvioDoc>("envios"),
  intentos: () => col<IntentoDoc>("intentos"),
};

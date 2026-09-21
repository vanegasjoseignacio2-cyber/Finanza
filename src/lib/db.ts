import { MongoClient, type Db, type Collection } from "mongodb";
import type { MovimientoDoc, RecordatorioDoc } from "./types";

const dbName = process.env.MONGODB_DB || "finanza";

// En desarrollo el hot reload recrea los módulos: se cachea el cliente en global
// para no abrir una conexión nueva en cada recarga.
const globalMongo = globalThis as unknown as {
  _finanzaMongo?: Promise<MongoClient>;
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

function cliente(): Promise<MongoClient> {
  globalMongo._finanzaMongo ??= crearCliente();
  return globalMongo._finanzaMongo;
}

let indicesListos: Promise<void> | null = null;

async function asegurarIndices(db: Db): Promise<void> {
  await Promise.all([
    db.collection("movimientos").createIndex({ mes: -1, fecha: -1 }),
    db.collection("movimientos").createIndex({ tipo: 1, fecha: -1 }),
    db.collection("recordatorios").createIndex({ dia: 1 }),
  ]);
}

export async function getDb(): Promise<Db> {
  const client = await cliente();
  const db = client.db(dbName);
  indicesListos ??= asegurarIndices(db).catch((error) => {
    // Los índices son una optimización: si el usuario de Atlas no tiene permiso
    // para crearlos la app debe seguir funcionando.
    console.error("No se pudieron crear los índices de MongoDB:", error);
  });
  await indicesListos;
  return db;
}

export async function movimientosCol(): Promise<Collection<MovimientoDoc>> {
  return (await getDb()).collection<MovimientoDoc>("movimientos");
}

export async function recordatoriosCol(): Promise<Collection<RecordatorioDoc>> {
  return (await getDb()).collection<RecordatorioDoc>("recordatorios");
}

import { AsyncLocalStorage } from "node:async_hooks";
import { MongoClient, type Binary, type Collection, type Db, type ObjectId } from "mongodb";
import { COOKIE_SESION, leerSesion } from "./auth";
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
  compraId?: string | null;
  cuota?: number | null;
  cuotas?: number | null;
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
  fecha?: string | null;
  desde?: string | null;
  creadoEn: string;
}

export interface CuentaDoc {
  _id: ObjectId;
  nombre: string;
  tipo: TipoCuenta;
  saldoInicial: number;
  cupo?: number | null;
  diaPago?: number | null;
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
  /** Último mes (YYYY-MM) cuyo sueldo se registró solo: evita duplicarlo. */
  sueldoAcreditado?: string;
  // Legado
  ingresoMensual?: number;
  metaAhorro?: number;
  metaNombre?: string;
  metaFechaLimite?: string | null;
}

/** Quien entra al panel. La colección tiene un solo documento: no hay registro público. */
export interface UsuarioDoc {
  _id: string; // correo en minúsculas
  claveHash: string;
  sesionVersion: number;
  /**
   * Nombre de la base donde viven los datos de esta persona. Cada usuario tiene la
   * suya, así que sus datos no se pueden mezclar. Sin este campo (el primer
   * usuario, anterior a los perfiles) se usa la base principal, MONGODB_DB.
   */
  base?: string;
  creadoEn: string;
  actualizadoEn?: string;
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

export interface PortadaDoc {
  _id: string; // YYYY-MM o "todos"
  tipo: "auto" | "fondo" | "enlace" | "imagen";
  fondo?: number;
  url?: string;
  imagen?: Binary;
  mime?: string;
  version: string;
  actualizadoEn: string;
}

export interface IntentoDoc {
  _id: string; // hash de la IP
  fallos: number;
  desde: Date;
  bloqueadoHasta: Date | null;
}

/** Contador de peticiones por cubo y ventana; Mongo lo borra solo al expirar. */
export interface LimiteDoc {
  _id: string; // cubo:ventana
  cuenta: number;
  expiraEn: Date;
}

/* ─── Conexión ───────────────────────────────────────────────────────────── */

// En desarrollo el hot reload recrea los módulos: se cachea el cliente en
// global para no abrir una conexión nueva en cada recarga. Next también
// empaqueta la API y las páginas por separado, así que todo lo compartido va en
// globalThis para que exista una sola copia.
const globalMongo = globalThis as unknown as {
  _finanzaMongo?: Promise<MongoClient>;
  _finanzaIndices?: Map<string, Promise<void>>;
  _finanzaContexto?: AsyncLocalStorage<string>;
  _finanzaBases?: Map<string, string>;
  _finanzaUsuarioPruebas?: string;
};

async function crearCliente(): Promise<MongoClient> {
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
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS) || 10_000,
  }).connect();
}

/**
 * El cliente compartido. Si el primer intento de conexión falla (un corte de red
 * pasajero), el error NO se queda guardado: la siguiente petición vuelve a
 * intentarlo. Antes quedaba la promesa rechazada en caché y todas las peticiones
 * fallaban hasta reiniciar el servidor.
 */
function clienteCompartido(): Promise<MongoClient> {
  const intento = (globalMongo._finanzaMongo ??= crearCliente());
  intento.catch(() => {
    if (globalMongo._finanzaMongo === intento) globalMongo._finanzaMongo = undefined;
  });
  return intento;
}

/** Índices de los datos de cada persona. */
async function indicesDeUsuario(db: Db): Promise<void> {
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

/** Índices de lo que es de todos: los contadores de límites caducan solos. */
async function indicesGlobales(db: Db): Promise<void> {
  await db.collection("limites").createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0 });
}

async function conIndices(nombre: string, crear: (db: Db) => Promise<void>): Promise<Db> {
  const client = await clienteCompartido();
  const db = client.db(nombre);
  const hechos = (globalMongo._finanzaIndices ??= new Map());
  if (!hechos.has(nombre)) {
    hechos.set(
      nombre,
      crear(db).catch((error) => {
        // Los índices son una optimización: si el usuario de Atlas no puede
        // crearlos, la app sigue funcionando.
        console.error("No se pudieron crear los índices de MongoDB:", error);
        hechos.delete(nombre); // se reintentan en la próxima petición
      }),
    );
  }
  await hechos.get(nombre);
  return db;
}

function nombreBasePrincipal(): string {
  // Se lee en cada llamada: las pruebas de integración usan otra base.
  return process.env.MONGODB_DB || "finanza";
}

/**
 * Base principal: guarda lo compartido (usuarios, intentos de acceso y límites).
 * Ahí viven también los datos del primer usuario, anterior a los perfiles.
 */
export async function getDb(): Promise<Db> {
  return conIndices(nombreBasePrincipal(), async (db) => {
    await Promise.all([indicesGlobales(db), indicesDeUsuario(db)]);
  });
}

/* ─── Quién es el usuario de esta petición ───────────────────────────────── */

function contexto(): AsyncLocalStorage<string> {
  return (globalMongo._finanzaContexto ??= new AsyncLocalStorage<string>());
}

/**
 * Ejecuta `fn` como ese usuario: lo que pida a los datos sale de su base. Lo usa
 * el cron, que recorre a todos los usuarios sin una sesión de navegador.
 */
export function conUsuario<T>(correo: string, fn: () => Promise<T>): Promise<T> {
  return contexto().run(correo.trim().toLowerCase(), fn);
}

/** Solo para las pruebas: fija el usuario cuando FINANZA_PRUEBAS=1. */
export function fijarUsuarioDePruebas(correo: string | undefined): void {
  globalMongo._finanzaUsuarioPruebas = correo;
}

const pruebasActivas = () => process.env.FINANZA_PRUEBAS === "1" && Boolean(globalMongo._finanzaUsuarioPruebas);

/**
 * El usuario dueño de los datos que se piden: el del contexto explícito (cron) o,
 * si no, el de la sesión de esta petición (la cookie firmada). Sin ninguno, error:
 * jamás se devuelve la base de otra persona por defecto.
 */
async function correoDeLaPeticion(): Promise<string> {
  const explicito = contexto().getStore();
  if (explicito) return explicito;
  if (pruebasActivas()) return globalMongo._finanzaUsuarioPruebas as string;
  let token: string | undefined;
  try {
    // La configuración de TypeScript de las pruebas no resuelve los tipos de Next.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { cookies } = await import("next/headers");
    token = (await cookies()).get(COOKIE_SESION)?.value;
  } catch {
    token = undefined; // fuera de una petición no hay cookies
  }
  const sesion = await leerSesion(token);
  if (!sesion) throw new Error("No hay un usuario con sesión para acceder a los datos.");
  return sesion.correo;
}

async function nombreBaseDe(correo: string): Promise<string> {
  if (pruebasActivas() && !contexto().getStore()) return nombreBasePrincipal();
  const bases = (globalMongo._finanzaBases ??= new Map());
  const guardada = bases.get(correo);
  if (guardada) return guardada;
  const doc = await (await getDb()).collection<UsuarioDoc>("usuarios").findOne({ _id: correo }, { projection: { base: 1 } });
  if (!doc) throw new Error("El usuario no existe.");
  const base = doc.base || nombreBasePrincipal();
  bases.set(correo, base);
  return base;
}

/** Base del usuario de esta petición, con sus índices. */
export async function getDbUsuario(): Promise<Db> {
  const nombre = await nombreBaseDe(await correoDeLaPeticion());
  if (nombre === nombreBasePrincipal()) return getDb();
  return conIndices(nombre, indicesDeUsuario);
}

/** Cierra la conexión compartida (lo usan las pruebas al terminar). */
export async function cerrarConexion(): Promise<void> {
  const pendiente = globalMongo._finanzaMongo;
  globalMongo._finanzaMongo = undefined;
  globalMongo._finanzaIndices = undefined;
  globalMongo._finanzaBases = undefined;
  if (pendiente) await (await pendiente).close();
}

async function colGlobal<T extends object>(nombre: string): Promise<Collection<T>> {
  return (await getDb()).collection<T>(nombre);
}

async function colUsuario<T extends object>(nombre: string): Promise<Collection<T>> {
  return (await getDbUsuario()).collection<T>(nombre);
}

export const colecciones = {
  // De cada persona: viven en su propia base.
  movimientos: () => colUsuario<MovimientoDoc>("movimientos"),
  recordatorios: () => colUsuario<RecordatorioDoc>("recordatorios"),
  cuentas: () => colUsuario<CuentaDoc>("cuentas"),
  metas: () => colUsuario<MetaDoc>("metas"),
  presupuestos: () => colUsuario<PresupuestoDoc>("presupuestos"),
  categorias: () => colUsuario<CategoriaDoc>("categorias"),
  ajustes: () => colUsuario<AjustesDoc>("ajustes"),
  envios: () => colUsuario<EnvioDoc>("envios"),
  portadas: () => colUsuario<PortadaDoc>("portadas"),
  // De todos: en la base principal.
  usuarios: () => colGlobal<UsuarioDoc>("usuarios"),
  intentos: () => colGlobal<IntentoDoc>("intentos"),
  limites: () => colGlobal<LimiteDoc>("limites"),
};

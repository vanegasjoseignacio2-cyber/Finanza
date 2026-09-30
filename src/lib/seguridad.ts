import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { COOKIE_SESION, leerSesion } from "./auth";
import { buscarUsuario, consumirLimite, type Usuario } from "./datos";
import { respuestaError } from "./validacion";

const scrypt = promisify(scryptCb) as (
  clave: string,
  sal: Buffer,
  largo: number,
) => Promise<Buffer>;

/* ─── Claves ─────────────────────────────────────────────────────────────── */


export async function hashClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(clave, sal, 64);
  return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
}

async function verificarHash(clave: string, guardado: string): Promise<boolean> {
  const [algoritmo, salB64, hashB64] = guardado.split("$");
  if (algoritmo !== "scrypt" || !salB64 || !hashB64) return false;
  const esperado = Buffer.from(hashB64, "base64");
  const calculado = await scrypt(clave, Buffer.from(salB64, "base64"), esperado.length);
  return timingSafeEqual(calculado, esperado);
}

// Contra este hash se compara cuando el correo no existe: así tardar lo mismo
// no delata qué correos tienen cuenta.
let hashFalso: Promise<string> | null = null;

/**
 * Comprueba correo y clave. Devuelve el usuario o null, sin distinguir si falló
 * el correo o la clave.
 */
export async function verificarCredenciales(correo: string, clave: string): Promise<Usuario | null> {
  const usuario = await buscarUsuario(correo);
  hashFalso ??= hashClave(randomBytes(16).toString("hex"));
  const valida = await verificarHash(clave, usuario?.claveHash ?? (await hashFalso));
  return usuario && valida ? usuario : null;
}

/** La clave actual de un usuario que ya tiene sesión (para cambiarla). */
export async function claveActualCorrecta(correo: string, clave: string): Promise<boolean> {
  return (await verificarCredenciales(correo, clave)) !== null;
}

/* ─── Sesión ─────────────────────────────────────────────────────────────── */

// La versión vigente se cachea unos segundos para no consultar la base en cada
// petición. Cerrar todas las sesiones tarda como mucho eso en surtir efecto.
const CACHE_MS = 15_000;
const cacheVersion = new Map<string, { valor: number | null; hasta: number }>();

async function versionVigente(correo: string): Promise<number | null> {
  const guardada = cacheVersion.get(correo);
  if (guardada && guardada.hasta > Date.now()) return guardada.valor;
  const usuario = await buscarUsuario(correo);
  const valor = usuario?.sesionVersion ?? null;
  cacheVersion.set(correo, { valor, hasta: Date.now() + CACHE_MS });
  return valor;
}

export function olvidarVersionCacheada(): void {
  cacheVersion.clear();
}

/**
 * Comprobación completa: firma, caducidad, que el usuario exista y que la
 * sesión no se haya revocado. Devuelve el correo del usuario o null.
 */
export async function usuarioActual(): Promise<string | null> {
  const sesion = await leerSesion((await cookies()).get(COOKIE_SESION)?.value);
  if (!sesion) return null;
  return sesion.version === (await versionVigente(sesion.correo)) ? sesion.correo : null;
}

export async function sesionVigente(): Promise<boolean> {
  return (await usuarioActual()) !== null;
}

type Manejador<C> = (request: Request, contexto: C) => Promise<Response>;

interface OpcionesLimite {
  /** Cubo propio: las rutas delicadas cuentan aparte de las demás. */
  cubo?: string;
  max?: number;
}

const VENTANA_LIMITE_MS = 60_000;
const MAX_PETICIONES_MINUTO = 120;

export function respuestaLimite(reintentarEnS: number): Response {
  return Response.json(
    { error: "Demasiadas peticiones. Espera un momento e intenta de nuevo." },
    { status: 429, headers: { "retry-after": String(reintentarEnS) } },
  );
}

/**
 * Envuelve un Route Handler: exige sesión vigente, limita las peticiones por
 * cliente y convierte cualquier error en una respuesta JSON coherente.
 */
export function protegido<C = unknown>(
  manejador: Manejador<C>,
  { cubo = "api", max = MAX_PETICIONES_MINUTO }: OpcionesLimite = {},
): Manejador<C> {
  return async (request, contexto) => {
    try {
      const correo = await usuarioActual();
      if (!correo) return Response.json({ error: "Sesión expirada." }, { status: 401 });
      // Se cuenta por usuario y no por IP: la identidad sale del token firmado,
      // que nadie puede falsear cambiando una cabecera.
      const limite = await consumirLimite(`${cubo}:${hashCorto(correo)}`, max, VENTANA_LIMITE_MS);
      if (!limite.permitido) return respuestaLimite(limite.reintentarEnS);
      return await manejador(request, contexto);
    } catch (error) {
      return respuestaError(error);
    }
  };
}

/* ─── Identidad del cliente para el límite de intentos ───────────────────── */

function hashCorto(texto: string): string {
  return createHash("sha256").update(`finanza:${texto}`).digest("hex").slice(0, 32);
}

/**
 * Hash de la IP del cliente. Las cabeceras de reenvío las escribe quien quiera
 * si la petición llega directa al servidor, así que solo se leen en Vercel, cuyo
 * borde las reescribe con la IP real (`x-vercel-forwarded-for` no la toca nadie
 * más). Fuera de Vercel no se confía en ninguna: todos cuentan como un mismo
 * cliente, que es lo seguro.
 */
export function claveCliente(request: Request): string {
  let ip = "local";
  if (process.env.VERCEL) {
    ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "desconocida";
  }
  return hashCorto(ip);
}

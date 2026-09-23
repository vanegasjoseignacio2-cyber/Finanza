import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { COOKIE_SESION, leerSesion } from "./auth";
import { obtenerSeguridad } from "./datos";
import { respuestaError } from "./validacion";

const scrypt = promisify(scryptCb) as (
  clave: string,
  sal: Buffer,
  largo: number,
) => Promise<Buffer>;

/* ─── Claves ─────────────────────────────────────────────────────────────── */

export const LARGO_MINIMO_CLAVE = 10;

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

function igualesTiempoConstante(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * La clave cambiada desde Ajustes manda; mientras no exista, vale APP_PASSWORD.
 */
export async function claveCorrecta(intento: string): Promise<boolean> {
  const { claveHash } = await obtenerSeguridad();
  if (claveHash) return verificarHash(intento, claveHash);
  const inicial = process.env.APP_PASSWORD;
  if (!inicial) {
    throw new Error("Falta APP_PASSWORD: define la clave con la que entras a tu panel.");
  }
  return igualesTiempoConstante(intento, inicial);
}

/* ─── Sesión ─────────────────────────────────────────────────────────────── */

// La versión vigente se cachea unos segundos para no consultar la base en cada
// petición. Cerrar todas las sesiones tarda como mucho eso en surtir efecto.
const CACHE_MS = 15_000;
let cacheVersion: { valor: number; hasta: number } | null = null;

async function versionVigente(): Promise<number> {
  if (cacheVersion && cacheVersion.hasta > Date.now()) return cacheVersion.valor;
  const { sesionVersion } = await obtenerSeguridad();
  cacheVersion = { valor: sesionVersion, hasta: Date.now() + CACHE_MS };
  return sesionVersion;
}

export function olvidarVersionCacheada(): void {
  cacheVersion = null;
}

/** Comprobación completa: firma, caducidad y que no se haya revocado. */
export async function sesionVigente(): Promise<boolean> {
  const sesion = await leerSesion((await cookies()).get(COOKIE_SESION)?.value);
  if (!sesion) return false;
  return sesion.version === (await versionVigente());
}

type Manejador<C> = (request: Request, contexto: C) => Promise<Response>;

/**
 * Envuelve un Route Handler: exige sesión vigente y convierte cualquier error
 * en una respuesta JSON coherente.
 */
export function protegido<C = unknown>(manejador: Manejador<C>): Manejador<C> {
  return async (request, contexto) => {
    try {
      if (!(await sesionVigente())) {
        return Response.json({ error: "Sesión expirada." }, { status: 401 });
      }
      return await manejador(request, contexto);
    } catch (error) {
      return respuestaError(error);
    }
  };
}

/* ─── Identidad del cliente para el límite de intentos ───────────────────── */

/** Hash de la IP: sirve para contar intentos sin guardar la IP en claro. */
export function claveCliente(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "desconocida";
  return createHash("sha256").update(`finanza:${ip}`).digest("hex").slice(0, 32);
}

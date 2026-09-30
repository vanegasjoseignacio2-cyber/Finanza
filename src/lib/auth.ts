import { SignJWT, jwtVerify } from "jose";

// El prefijo __Host- obliga al navegador a aceptarla solo por HTTPS, sin
// dominio y en la raíz: ningún subdominio puede pisarla.
export const COOKIE_SESION =
  process.env.NODE_ENV === "production" ? "__Host-finanza_sesion" : "finanza_sesion";
const DURACION_HORAS = 6;
const EMISOR = "finanza";

function secreto(): Uint8Array {
  const valor = process.env.AUTH_SECRET;
  if (!valor || valor.length < 24) {
    throw new Error(
      "Falta AUTH_SECRET (mínimo 24 caracteres). Genera uno con: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(valor);
}

/**
 * El token lleva el correo del usuario como sujeto y `version`, la versión de
 * sesión vigente: al subirla en la base, caen todos los tokens.
 */
export async function crearSesion(correo: string, version: number): Promise<string> {
  return new SignJWT({ v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(correo)
    .setIssuer(EMISOR)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_HORAS}h`)
    .sign(secreto());
}

/** Verifica firma y caducidad. Devuelve el usuario y la versión de sesión del token. */
export async function leerSesion(
  token: string | undefined,
): Promise<{ correo: string; version: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto(), {
      issuer: EMISOR,
      algorithms: ["HS256"],
    });
    if (!payload.sub || typeof payload.v !== "number") return null;
    return { correo: payload.sub, version: payload.v };
  } catch {
    return null;
  }
}

/** Comprobación optimista (solo firma), la que usa el proxy. */
export async function sesionValida(token: string | undefined): Promise<boolean> {
  return (await leerSesion(token)) !== null;
}

export const opcionesCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DURACION_HORAS * 60 * 60,
};

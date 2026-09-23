import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESION = "finanza_sesion";
const DURACION_DIAS = 30;

function secreto(): Uint8Array {
  const valor = process.env.AUTH_SECRET;
  if (!valor || valor.length < 24) {
    throw new Error(
      "Falta AUTH_SECRET (mínimo 24 caracteres). Genera uno con: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(valor);
}

/** `version` ata el token a la versión de sesión vigente: al subirla, caen todos. */
export async function crearSesion(version: number): Promise<string> {
  return new SignJWT({ v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("finanza")
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DIAS}d`)
    .sign(secreto());
}

/** Verifica firma y caducidad. Devuelve la versión de sesión del token. */
export async function leerSesion(token: string | undefined): Promise<{ version: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto(), { subject: "finanza" });
    return { version: typeof payload.v === "number" ? payload.v : 0 };
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
  maxAge: DURACION_DIAS * 24 * 60 * 60,
};

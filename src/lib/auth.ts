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

export async function crearSesion(): Promise<string> {
  return new SignJWT({ rol: "dueño" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("finanza")
    .setIssuedAt()
    .setExpirationTime(`${DURACION_DIAS}d`)
    .sign(secreto());
}

export async function sesionValida(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secreto(), { subject: "finanza" });
    return true;
  } catch {
    return false;
  }
}

/** Comparación en tiempo constante sobre el hash, válida en Node y en Edge. */
export async function claveCorrecta(intento: string): Promise<boolean> {
  const esperada = process.env.APP_PASSWORD;
  if (!esperada) {
    throw new Error("Falta APP_PASSWORD: define la clave con la que entras a tu panel.");
  }
  const [a, b] = await Promise.all([digest(intento), digest(esperada)]);
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i] ^ b[i];
  return diferencia === 0;
}

async function digest(valor: string): Promise<Uint8Array> {
  const datos = new TextEncoder().encode(valor);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", datos));
}

export const opcionesCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: DURACION_DIAS * 24 * 60 * 60,
};

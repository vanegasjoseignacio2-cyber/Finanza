import { cookies } from "next/headers";
import { COOKIE_SESION, crearSesion, opcionesCookie } from "@/lib/auth";
import { incrementarVersionSesion } from "@/lib/datos";
import {
  LARGO_MINIMO_CLAVE,
  claveCorrecta,
  hashClave,
  olvidarVersionCacheada,
  protegido,
} from "@/lib/seguridad";
import { ErrorValidacion, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

/** Cambia la clave y cierra las demás sesiones; esta sigue abierta. */
export const POST = protegido(async (request) => {
  const c = await leerJson(request);
  const actual = typeof c.actual === "string" ? c.actual : "";
  const nueva = typeof c.nueva === "string" ? c.nueva : "";
  if (!(await claveCorrecta(actual))) throw new ErrorValidacion("La clave actual no es correcta.");
  if (nueva.length < LARGO_MINIMO_CLAVE) {
    throw new ErrorValidacion(`La clave nueva debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`);
  }
  if (nueva === actual) throw new ErrorValidacion("La clave nueva debe ser distinta de la actual.");

  const version = await incrementarVersionSesion(await hashClave(nueva));
  olvidarVersionCacheada();
  (await cookies()).set(COOKIE_SESION, await crearSesion(version), opcionesCookie);
  return Response.json({ ok: true });
});

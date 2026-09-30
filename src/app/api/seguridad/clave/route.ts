import { cookies } from "next/headers";
import { COOKIE_SESION, crearSesion, opcionesCookie } from "@/lib/auth";
import { incrementarVersionSesion } from "@/lib/datos";
import {
  claveActualCorrecta,
  hashClave,
  olvidarVersionCacheada,
  protegido,
  usuarioActual,
} from "@/lib/seguridad";
import { errorClave } from "@/lib/politica-clave";
import { ErrorValidacion, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

/** Cambia la clave y cierra las demás sesiones; esta sigue abierta. */
export const POST = protegido(async (request) => {
  const c = await leerJson(request);
  const actual = typeof c.actual === "string" ? c.actual.slice(0, 200) : "";
  const nueva = typeof c.nueva === "string" ? c.nueva.slice(0, 200) : "";
  const correo = await usuarioActual();
  if (!correo) return Response.json({ error: "Sesión expirada." }, { status: 401 });
  if (!(await claveActualCorrecta(correo, actual))) {
    throw new ErrorValidacion("La clave actual no es correcta.");
  }
  const incumplida = errorClave(nueva, { correo, actual });
  if (incumplida) throw new ErrorValidacion(incumplida);

  const version = await incrementarVersionSesion(correo, await hashClave(nueva));
  olvidarVersionCacheada();
  (await cookies()).set(COOKIE_SESION, await crearSesion(correo, version), opcionesCookie);
  return Response.json({ ok: true });
}, { cubo: "clave", max: 5 });

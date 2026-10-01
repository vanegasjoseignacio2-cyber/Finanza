import { incrementarVersionSesion } from "@/lib/datos";
import { borrarCookieSesion, olvidarVersionCacheada, protegido, usuarioActual } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

/** Invalida todas las sesiones, esta incluida. */
export const POST = protegido(async () => {
  const correo = await usuarioActual();
  if (correo) await incrementarVersionSesion(correo);
  olvidarVersionCacheada();
  await borrarCookieSesion();
  return Response.json({ ok: true });
});

import { cookies } from "next/headers";
import { COOKIE_SESION } from "@/lib/auth";
import { incrementarVersionSesion } from "@/lib/datos";
import { olvidarVersionCacheada, protegido } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

/** Invalida todas las sesiones, esta incluida. */
export const POST = protegido(async () => {
  await incrementarVersionSesion();
  olvidarVersionCacheada();
  (await cookies()).delete(COOKIE_SESION);
  return Response.json({ ok: true });
});

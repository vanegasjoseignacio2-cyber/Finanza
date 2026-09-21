import { cookies } from "next/headers";
import { COOKIE_SESION, claveCorrecta, crearSesion, opcionesCookie } from "@/lib/auth";
import { leerJson, respuestaError } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cuerpo = await leerJson(request);
    const clave = typeof cuerpo.clave === "string" ? cuerpo.clave : "";
    if (!(await claveCorrecta(clave))) {
      // Retraso corto para que probar claves a ciegas no sea gratis.
      await new Promise((r) => setTimeout(r, 600));
      return Response.json({ error: "Clave incorrecta." }, { status: 401 });
    }
    const token = await crearSesion();
    (await cookies()).set(COOKIE_SESION, token, opcionesCookie);
    return Response.json({ ok: true });
  } catch (error) {
    return respuestaError(error);
  }
}

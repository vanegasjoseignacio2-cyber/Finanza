import { cookies } from "next/headers";
import { COOKIE_SESION, crearSesion, opcionesCookie } from "@/lib/auth";
import { bloqueadoHasta, limpiarIntentos, obtenerSeguridad, registrarFallo } from "@/lib/datos";
import { claveCliente, claveCorrecta } from "@/lib/seguridad";
import { leerJson, respuestaError } from "@/lib/validacion";

export const dynamic = "force-dynamic";

function minutosHasta(fecha: Date): number {
  return Math.max(1, Math.ceil((fecha.getTime() - Date.now()) / 60_000));
}

export async function POST(request: Request) {
  try {
    const cliente = claveCliente(request);
    const bloqueo = await bloqueadoHasta(cliente);
    if (bloqueo) {
      return Response.json(
        { error: `Demasiados intentos. Espera ${minutosHasta(bloqueo)} minutos.` },
        { status: 429 },
      );
    }

    const cuerpo = await leerJson(request);
    const clave = typeof cuerpo.clave === "string" ? cuerpo.clave : "";
    if (!(await claveCorrecta(clave))) {
      const nuevoBloqueo = await registrarFallo(cliente);
      return Response.json(
        {
          error: nuevoBloqueo
            ? `Clave incorrecta. Por seguridad, espera ${minutosHasta(nuevoBloqueo)} minutos.`
            : "Clave incorrecta.",
        },
        { status: nuevoBloqueo ? 429 : 401 },
      );
    }

    await limpiarIntentos(cliente);
    const { sesionVersion } = await obtenerSeguridad();
    (await cookies()).set(COOKIE_SESION, await crearSesion(sesionVersion), opcionesCookie);
    return Response.json({ ok: true });
  } catch (error) {
    return respuestaError(error);
  }
}

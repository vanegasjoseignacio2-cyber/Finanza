import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE_SESION, crearSesion, opcionesCookie } from "@/lib/auth";
import { bloqueadoHasta, consumirLimite, limpiarIntentos, registrarFallo } from "@/lib/datos";
import { claveCliente, respuestaLimite, verificarCredenciales } from "@/lib/seguridad";
import { leerJson, respuestaError } from "@/lib/validacion";

export const dynamic = "force-dynamic";

// Intentos contra una misma cuenta desde cualquier IP: frena un ataque repartido
// entre muchas direcciones sin dejar al dueño fuera por unos cuantos errores.
const MAX_INTENTOS_CUENTA = 20;
const MAX_INTENTOS_GLOBAL = 100;
const VENTANA_CUENTA_MS = 15 * 60 * 1000;

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
    const correo = typeof cuerpo.correo === "string" ? cuerpo.correo.trim().toLowerCase().slice(0, 200) : "";
    const clave = typeof cuerpo.clave === "string" ? cuerpo.clave.slice(0, 200) : "";

    // Tope global, sin depender de ninguna IP: aunque alguien las cambie a cada
    // intento, el total de intentos de acceso por ventana tiene techo.
    const global = await consumirLimite("login:global", MAX_INTENTOS_GLOBAL, VENTANA_CUENTA_MS);
    if (!global.permitido) return respuestaLimite(global.reintentarEnS);

    const cuenta = await consumirLimite(
      `login:${createHash("sha256").update(correo).digest("hex").slice(0, 32)}`,
      MAX_INTENTOS_CUENTA,
      VENTANA_CUENTA_MS,
    );
    if (!cuenta.permitido) return respuestaLimite(cuenta.reintentarEnS);

    const usuario = await verificarCredenciales(correo, clave);
    if (!usuario) {
      const nuevoBloqueo = await registrarFallo(cliente);
      return Response.json(
        {
          error: nuevoBloqueo
            ? `Correo o clave incorrectos. Por seguridad, espera ${minutosHasta(nuevoBloqueo)} minutos.`
            : "Correo o clave incorrectos.",
        },
        { status: nuevoBloqueo ? 429 : 401 },
      );
    }

    await limpiarIntentos(cliente);
    (await cookies()).set(
      COOKIE_SESION,
      await crearSesion(usuario.correo, usuario.sesionVersion),
      opcionesCookie,
    );
    return Response.json({ ok: true });
  } catch (error) {
    return respuestaError(error);
  }
}

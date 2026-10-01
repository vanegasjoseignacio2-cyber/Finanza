import { timingSafeEqual } from "node:crypto";
import { acreditarSueldoSiToca, consumirLimite, listarUsuarios } from "@/lib/datos";
import { conUsuario } from "@/lib/db";
import { ejecutarRecordatorioDiario } from "@/lib/recordatorio-diario";
import { respuestaLimite } from "@/lib/seguridad";
import { respuestaError } from "@/lib/validacion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function coincide(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Dispara el correo del día. Lo llaman Vercel Cron, GitHub Actions o un
 * servicio externo, siempre con el secreto compartido. Llamarlo dos veces es
 * seguro: solo una llamada llega a enviar.
 */
async function manejar(request: Request): Promise<Response> {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return Response.json({ error: "Falta CRON_SECRET en el servidor." }, { status: 500 });
  }
  try {
    const limite = await consumirLimite("cron:global", 30, 60_000);
    if (!limite.permitido) return respuestaLimite(limite.reintentarEnS);
  } catch (error) {
    return respuestaError(error);
  }
  const cabecera = request.headers.get("authorization") ?? "";
  // Solo por cabecera: un secreto en la URL queda en registros e historiales.
  if (!coincide(cabecera, `Bearer ${secreto}`)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    // Cada persona tiene sus datos y su correo: se recorre a todos, uno por uno.
    // Que a alguien le falle no impide el aviso de los demás.
    const urlApp = process.env.APP_URL || new URL(request.url).origin;
    const resultados = [];
    for (const correo of await listarUsuarios()) {
      try {
        resultados.push(
          await conUsuario(correo, async () => {
            // El sueldo se registra solo el día que llega, aunque el correo esté apagado.
            const sueldo = await acreditarSueldoSiToca().catch((error) => ({
              acreditado: false,
              motivo: error instanceof Error ? error.message : "No se pudo registrar el sueldo.",
            }));
            const diario = await ejecutarRecordatorioDiario({ urlApp, usuario: correo });
            return { usuario: correo, ...diario, sueldo };
          }),
        );
      } catch (error) {
        console.error(`Falló el aviso diario de un usuario:`, error);
        resultados.push({ usuario: correo, enviado: false, error: "No se pudo procesar a este usuario." });
      }
    }
    const fallo = resultados.some((r) => r.error);
    return Response.json({ resultados }, { status: fallo ? 502 : 200 });
  } catch (error) {
    return respuestaError(error);
  }
}

export const GET = manejar;
export const POST = manejar;

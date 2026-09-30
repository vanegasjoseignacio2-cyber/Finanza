import { timingSafeEqual } from "node:crypto";
import { acreditarSueldoSiToca, consumirLimite } from "@/lib/datos";
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
    // El sueldo se registra solo el día que llega, aunque el correo esté apagado.
    const sueldo = await acreditarSueldoSiToca().catch((error) => ({
      acreditado: false,
      motivo: error instanceof Error ? error.message : "No se pudo registrar el sueldo.",
    }));
    const resultado = await ejecutarRecordatorioDiario({
      urlApp: process.env.APP_URL || new URL(request.url).origin,
    });
    return Response.json({ ...resultado, sueldo }, { status: resultado.error ? 502 : 200 });
  } catch (error) {
    return respuestaError(error);
  }
}

export const GET = manejar;
export const POST = manejar;

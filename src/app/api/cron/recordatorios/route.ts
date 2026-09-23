import { timingSafeEqual } from "node:crypto";
import { ejecutarRecordatorioDiario } from "@/lib/recordatorio-diario";
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
  const cabecera = request.headers.get("authorization") ?? "";
  const enUrl = new URL(request.url).searchParams.get("secreto") ?? "";
  if (!coincide(cabecera, `Bearer ${secreto}`) && !coincide(enUrl, secreto)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const resultado = await ejecutarRecordatorioDiario({
      urlApp: process.env.APP_URL || new URL(request.url).origin,
    });
    return Response.json(resultado, { status: resultado.error ? 502 : 200 });
  } catch (error) {
    return respuestaError(error);
  }
}

export const GET = manejar;
export const POST = manejar;

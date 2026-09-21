import { ejecutarRecordatorioDiario } from "@/lib/recordatorio-diario";
import { comoEmail, leerJson, respuestaError } from "@/lib/validacion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const cuerpo = await leerJson(request).catch(() => ({}) as Record<string, unknown>);
    const destino = comoEmail(cuerpo.destino, false);
    const resultado = await ejecutarRecordatorioDiario({
      forzar: true,
      destino: destino || undefined,
      urlApp: process.env.APP_URL || new URL(request.url).origin,
    });
    if (resultado.error) {
      return Response.json({ error: resultado.error }, { status: 502 });
    }
    if (!resultado.enviado) {
      return Response.json({ error: resultado.motivo ?? "No se pudo enviar." }, { status: 400 });
    }
    return Response.json(resultado);
  } catch (error) {
    return respuestaError(error);
  }
}

import { ejecutarRecordatorioDiario } from "@/lib/recordatorio-diario";
import { protegido } from "@/lib/seguridad";
import { comoEmail, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = protegido(async (request) => {
  const c = await leerJson(request).catch(() => ({}) as Record<string, unknown>);
  const destino = comoEmail(c.destino);
  const resultado = await ejecutarRecordatorioDiario({
    forzar: true,
    destino: destino || undefined,
    urlApp: process.env.APP_URL || new URL(request.url).origin,
  });
  if (resultado.error) return Response.json({ error: resultado.error }, { status: 502 });
  if (!resultado.enviado) {
    return Response.json({ error: resultado.motivo ?? "No se pudo enviar." }, { status: 400 });
  }
  return Response.json(resultado);
});

import { obtenerAjustes } from "@/lib/datos";
import { ejecutarRecordatorioDiario } from "@/lib/recordatorio-diario";
import { protegido } from "@/lib/seguridad";
import { ErrorValidacion } from "@/lib/validacion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Manda el correo de prueba al correo que la persona guardó en Ajustes. No acepta
 * otra dirección: con ella, cualquier sesión podía escribir a donde quisiera desde
 * el correo de la app.
 */
export const POST = protegido(async () => {
  const { email } = await obtenerAjustes();
  if (!email) {
    throw new ErrorValidacion("Escribe tu correo de destino en Ajustes y guárdalo antes de enviar la prueba.");
  }
  const resultado = await ejecutarRecordatorioDiario({ forzar: true, destino: email });
  if (resultado.error) return Response.json({ error: resultado.error }, { status: 502 });
  if (!resultado.enviado) {
    return Response.json({ error: resultado.motivo ?? "No se pudo enviar." }, { status: 400 });
  }
  return Response.json(resultado);
}, { cubo: "correo", max: 5 });

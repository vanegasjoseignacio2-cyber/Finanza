import { crearRecordatorio, listarMovimientos, listarRecordatorios } from "@/lib/datos";
import { esCategoriaValida } from "@/lib/categorias";
import { calcularRecordatorios } from "@/lib/finanzas";
import { hoyISO, mesActual } from "@/lib/fechas";
import {
  comoDia,
  comoMonto,
  comoTexto,
  leerJson,
  respuestaError,
} from "@/lib/validacion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [recordatorios, movimientos] = await Promise.all([
      listarRecordatorios(),
      listarMovimientos({ mes: mesActual() }),
    ]);
    return Response.json({
      recordatorios: calcularRecordatorios(recordatorios, movimientos, hoyISO()),
    });
  } catch (error) {
    return respuestaError(error);
  }
}

export async function POST(request: Request) {
  try {
    const cuerpo = await leerJson(request);
    const categoria = esCategoriaValida(cuerpo.categoria) ? (cuerpo.categoria as string) : "";
    const recordatorio = await crearRecordatorio({
      titulo: comoTexto(cuerpo.titulo, "título", 80),
      dia: comoDia(cuerpo.dia),
      categoria,
      montoEstimado: comoMonto(cuerpo.montoEstimado, "monto estimado", true),
    });
    return Response.json({ recordatorio }, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}

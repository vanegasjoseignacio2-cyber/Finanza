import { calcularResumen } from "@/lib/datos";
import { esMesValido, mesActual } from "@/lib/fechas";
import { respuestaError } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const mes = new URL(request.url).searchParams.get("mes");
    const resumen = await calcularResumen(esMesValido(mes) ? mes : mesActual());
    return Response.json(resumen);
  } catch (error) {
    return respuestaError(error);
  }
}

import { crearMovimiento, listarMovimientos } from "@/lib/datos";
import { esMesValido } from "@/lib/fechas";
import {
  comoCategoria,
  comoFecha,
  comoMonto,
  comoTexto,
  comoTipo,
  leerJson,
  respuestaError,
} from "@/lib/validacion";
import type { TipoMovimiento } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const mes = params.get("mes");
    const tipo = params.get("tipo");
    const categoria = params.get("categoria");
    const movimientos = await listarMovimientos({
      mes: esMesValido(mes) ? mes : undefined,
      tipo: tipo === "gasto" || tipo === "ahorro" || tipo === "ingreso" ? (tipo as TipoMovimiento) : undefined,
      categoria: categoria || undefined,
    });
    return Response.json({ movimientos });
  } catch (error) {
    return respuestaError(error);
  }
}

export async function POST(request: Request) {
  try {
    const cuerpo = await leerJson(request);
    const tipo = comoTipo(cuerpo.tipo);
    const movimiento = await crearMovimiento({
      tipo,
      categoria: comoCategoria(cuerpo.categoria, tipo),
      monto: comoMonto(cuerpo.monto),
      fecha: comoFecha(cuerpo.fecha),
      nota: comoTexto(cuerpo.nota, "nota", 160, false),
    });
    return Response.json({ movimiento }, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}

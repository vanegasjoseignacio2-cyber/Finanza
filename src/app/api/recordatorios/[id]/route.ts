import {
  actualizarRecordatorio,
  desmarcarPago,
  eliminarRecordatorio,
} from "@/lib/datos";
import { esCategoriaValida } from "@/lib/categorias";
import { esMesValido } from "@/lib/fechas";
import {
  comoBooleano,
  comoDia,
  comoMonto,
  comoTexto,
  leerJson,
  respuestaError,
} from "@/lib/validacion";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const cuerpo = await leerJson(request);

    // Caso especial: deshacer el pago de un mes concreto.
    if (cuerpo.desmarcarMes) {
      const mes = String(cuerpo.desmarcarMes);
      if (!esMesValido(mes)) {
        return Response.json({ error: "Mes inválido." }, { status: 400 });
      }
      const actualizado = await desmarcarPago(id, mes);
      if (!actualizado) {
        return Response.json({ error: "No encontramos ese recordatorio." }, { status: 404 });
      }
      return Response.json({ recordatorio: actualizado });
    }

    const cambios: Parameters<typeof actualizarRecordatorio>[1] = {};
    if (cuerpo.titulo !== undefined) cambios.titulo = comoTexto(cuerpo.titulo, "título", 80);
    if (cuerpo.dia !== undefined) cambios.dia = comoDia(cuerpo.dia);
    if (cuerpo.montoEstimado !== undefined) {
      cambios.montoEstimado = comoMonto(cuerpo.montoEstimado, "monto estimado", true);
    }
    if (cuerpo.categoria !== undefined) {
      cambios.categoria = esCategoriaValida(cuerpo.categoria) ? (cuerpo.categoria as string) : "";
    }
    if (cuerpo.activo !== undefined) cambios.activo = comoBooleano(cuerpo.activo, true);
    if (cuerpo.marcarPagado !== undefined) {
      const mes = String(cuerpo.marcarPagado);
      if (!esMesValido(mes)) {
        return Response.json({ error: "Mes inválido." }, { status: 400 });
      }
      cambios.marcarPagado = mes;
    }

    const actualizado = await actualizarRecordatorio(id, cambios);
    if (!actualizado) {
      return Response.json({ error: "No encontramos ese recordatorio." }, { status: 404 });
    }
    return Response.json({ recordatorio: actualizado });
  } catch (error) {
    return respuestaError(error);
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const borrado = await eliminarRecordatorio(id);
    if (!borrado) {
      return Response.json({ error: "No encontramos ese recordatorio." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return respuestaError(error);
  }
}

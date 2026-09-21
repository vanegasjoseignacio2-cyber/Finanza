import { eliminarMovimiento } from "@/lib/datos";
import { respuestaError } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const borrado = await eliminarMovimiento(id);
    if (!borrado) {
      return Response.json({ error: "No encontramos ese movimiento." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return respuestaError(error);
  }
}

import { actualizarMovimiento, eliminarMovimiento, obtenerMovimiento } from "@/lib/datos";
import { datosMovimiento } from "@/lib/entradas";
import { protegido } from "@/lib/seguridad";
import { leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = protegido<Ctx>(async (_request, { params }) => {
  return Response.json({ movimiento: await obtenerMovimiento((await params).id) });
});

export const PUT = protegido<Ctx>(async (request, { params }) => {
  const { id } = await params;
  const movimiento = await actualizarMovimiento(id, datosMovimiento(await leerJson(request)));
  return Response.json({ movimiento });
});

/** `?compra=1` borra todas las cuotas de la compra a la que pertenece. */
export const DELETE = protegido<Ctx>(async (request, { params }) => {
  const compra = new URL(request.url).searchParams.get("compra") === "1";
  const eliminados = await eliminarMovimiento((await params).id, { compra });
  return Response.json({ ok: true, eliminados });
});

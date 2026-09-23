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

export const DELETE = protegido<Ctx>(async (_request, { params }) => {
  await eliminarMovimiento((await params).id);
  return Response.json({ ok: true });
});

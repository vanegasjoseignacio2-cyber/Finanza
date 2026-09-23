import { deshacerPago, pagarRecordatorio } from "@/lib/datos";
import { protegido } from "@/lib/seguridad";
import { comoFecha, comoIdOpcional, comoMes, comoMonto, comoTexto, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Registra el pago del mes: crea el gasto vinculado. */
export const POST = protegido<Ctx>(async (request, { params }) => {
  const { id } = await params;
  const c = await leerJson(request);
  const movimiento = await pagarRecordatorio(id, {
    monto: comoMonto(c.monto),
    fecha: comoFecha(c.fecha),
    cuentaId: comoIdOpcional(c.cuentaId),
    nota: comoTexto(c.nota, "nota", 160, false),
  });
  return Response.json({ movimiento }, { status: 201 });
});

/** Deshace el pago de un mes (borra el gasto vinculado y la marca manual). */
export const DELETE = protegido<Ctx>(async (request, { params }) => {
  const { id } = await params;
  await deshacerPago(id, comoMes(new URL(request.url).searchParams.get("mes")));
  return Response.json({ ok: true });
});

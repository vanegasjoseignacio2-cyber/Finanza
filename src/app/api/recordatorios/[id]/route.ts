import { actualizarRecordatorio, eliminarRecordatorio, marcarPagoManual } from "@/lib/datos";
import { protegido } from "@/lib/seguridad";
import {
  comoBooleano,
  comoDia,
  comoMes,
  comoMonto,
  comoTexto,
  leerJson,
} from "@/lib/validacion";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = protegido<Ctx>(async (request, { params }) => {
  const { id } = await params;
  const c = await leerJson(request);

  // Marca manual: "pagado sin registrar gasto" (lo pagó otra persona, etc.).
  if (c.pagadoManual !== undefined) {
    const recordatorio = await marcarPagoManual(id, comoMes(c.mes), comoBooleano(c.pagadoManual));
    return Response.json({ recordatorio });
  }

  const cambios: Parameters<typeof actualizarRecordatorio>[1] = {};
  if (c.titulo !== undefined) cambios.titulo = comoTexto(c.titulo, "nombre", 80);
  if (c.dia !== undefined) cambios.dia = comoDia(c.dia);
  if (c.montoEstimado !== undefined) cambios.montoEstimado = comoMonto(c.montoEstimado, "monto estimado", true);
  if (c.categoria !== undefined) cambios.categoria = typeof c.categoria === "string" ? c.categoria : "";
  if (c.activo !== undefined) cambios.activo = comoBooleano(c.activo, true);
  return Response.json({ recordatorio: await actualizarRecordatorio(id, cambios) });
});

export const DELETE = protegido<Ctx>(async (_request, { params }) => {
  await eliminarRecordatorio((await params).id);
  return Response.json({ ok: true });
});

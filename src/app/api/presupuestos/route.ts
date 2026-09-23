import { fijarPresupuesto, listarPresupuestos } from "@/lib/datos";
import { protegido } from "@/lib/seguridad";
import { comoMonto, comoTexto, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export const GET = protegido(async () => Response.json({ presupuestos: await listarPresupuestos() }));

/** Fija el tope mensual de una categoría; con 0 lo quita. */
export const PUT = protegido(async (request) => {
  const c = await leerJson(request);
  await fijarPresupuesto(comoTexto(c.categoria, "categoría", 40), comoMonto(c.tope ?? 0, "tope", true));
  return Response.json({ presupuestos: await listarPresupuestos() });
});

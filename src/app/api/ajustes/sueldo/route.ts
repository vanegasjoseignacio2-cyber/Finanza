import { fijarSueldo, quitarTramoSueldo } from "@/lib/datos";
import { protegido } from "@/lib/seguridad";
import { comoMes, comoMonto, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

/** Fija el sueldo desde un mes en adelante; los meses anteriores no cambian. */
export const POST = protegido(async (request) => {
  const c = await leerJson(request);
  const ajustes = await fijarSueldo(comoMes(c.desde), comoMonto(c.monto, "sueldo", true));
  return Response.json({ ajustes });
});

export const DELETE = protegido(async (request) => {
  const desde = comoMes(new URL(request.url).searchParams.get("desde"));
  return Response.json({ ajustes: await quitarTramoSueldo(desde) });
});

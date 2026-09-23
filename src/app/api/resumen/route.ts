import { calcularResumen } from "@/lib/datos";
import { esMesValido, mesActual } from "@/lib/fechas";
import { protegido } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

export const GET = protegido(async (request) => {
  const mes = new URL(request.url).searchParams.get("mes");
  return Response.json(await calcularResumen(esMesValido(mes) ? mes : mesActual()));
});

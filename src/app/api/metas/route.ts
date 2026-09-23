import { crearMeta, listarMetas } from "@/lib/datos";
import { datosMeta } from "@/lib/entradas";
import { protegido } from "@/lib/seguridad";
import { leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export const GET = protegido(async () => Response.json({ metas: await listarMetas() }));

export const POST = protegido(async (request) => {
  const meta = await crearMeta(datosMeta(await leerJson(request)));
  return Response.json({ meta }, { status: 201 });
});

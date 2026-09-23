import { actualizarMeta } from "@/lib/datos";
import { datosMeta } from "@/lib/entradas";
import { protegido } from "@/lib/seguridad";
import { comoBooleano, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = protegido<Ctx>(async (request, { params }) => {
  const { id } = await params;
  const c = await leerJson(request);
  // Archivar no toca el resto; editar exige los datos completos de la meta.
  const cambios =
    Object.keys(c).length === 1 && c.archivada !== undefined
      ? { archivada: comoBooleano(c.archivada) }
      : datosMeta(c);
  return Response.json({ meta: await actualizarMeta(id, cambios) });
});

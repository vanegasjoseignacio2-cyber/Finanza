import { actualizarCuenta } from "@/lib/datos";
import { datosCuenta } from "@/lib/entradas";
import { protegido } from "@/lib/seguridad";
import { comoBooleano, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = protegido<Ctx>(async (request, { params }) => {
  const { id } = await params;
  const c = await leerJson(request);
  const cambios =
    Object.keys(c).length === 1 && c.archivada !== undefined
      ? { archivada: comoBooleano(c.archivada) }
      : datosCuenta(c);
  return Response.json({ cuenta: await actualizarCuenta(id, cambios) });
});

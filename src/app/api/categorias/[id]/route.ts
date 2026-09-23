import { ICONOS_DISPONIBLES } from "@/lib/categorias";
import { actualizarCategoria, obtenerCatalogo } from "@/lib/datos";
import { protegido } from "@/lib/seguridad";
import { ErrorValidacion, comoBooleano, comoTexto, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = protegido<Ctx>(async (request, { params }) => {
  const { id } = await params;
  const c = await leerJson(request);
  const cambios: { label?: string; icono?: string; oculta?: boolean } = {};
  if (c.label !== undefined) cambios.label = comoTexto(c.label, "nombre", 30);
  if (c.oculta !== undefined) cambios.oculta = comoBooleano(c.oculta);
  if (c.icono !== undefined) {
    if (!(ICONOS_DISPONIBLES as readonly string[]).includes(String(c.icono))) {
      throw new ErrorValidacion("Ese icono no está disponible.");
    }
    cambios.icono = String(c.icono);
  }
  await actualizarCategoria(id, cambios);
  return Response.json({ categorias: (await obtenerCatalogo()).lista });
});

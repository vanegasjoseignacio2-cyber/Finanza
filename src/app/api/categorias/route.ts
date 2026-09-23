import { ICONOS_DISPONIBLES } from "@/lib/categorias";
import { crearCategoria, obtenerCatalogo } from "@/lib/datos";
import { protegido } from "@/lib/seguridad";
import { ErrorValidacion, comoTexto, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export const GET = protegido(async () => Response.json({ categorias: (await obtenerCatalogo()).lista }));

export const POST = protegido(async (request) => {
  const c = await leerJson(request);
  const icono = String(c.icono ?? "Package");
  if (!(ICONOS_DISPONIBLES as readonly string[]).includes(icono)) {
    throw new ErrorValidacion("Ese icono no está disponible.");
  }
  if (c.tipo !== "gasto" && c.tipo !== "ingreso") throw new ErrorValidacion("Tipo de categoría inválido.");
  const categoria = await crearCategoria({ label: comoTexto(c.label, "nombre", 30), icono, tipo: c.tipo });
  return Response.json({ categoria }, { status: 201 });
});

import { crearCuentaConDeuda, listarCuentas } from "@/lib/datos";
import { datosCuenta, datosDeudaCuotas } from "@/lib/entradas";
import { protegido } from "@/lib/seguridad";
import { leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export const GET = protegido(async () => Response.json({ cuentas: await listarCuentas() }));

export const POST = protegido(async (request) => {
  const c = await leerJson(request);
  const { cuenta, cuotas } = await crearCuentaConDeuda({ ...datosCuenta(c), ...datosDeudaCuotas(c) });
  return Response.json({ cuenta, cuotas }, { status: 201 });
});

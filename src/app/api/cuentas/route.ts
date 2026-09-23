import { crearCuenta, listarCuentas } from "@/lib/datos";
import { datosCuenta } from "@/lib/entradas";
import { protegido } from "@/lib/seguridad";
import { leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export const GET = protegido(async () => Response.json({ cuentas: await listarCuentas() }));

export const POST = protegido(async (request) => {
  const cuenta = await crearCuenta(datosCuenta(await leerJson(request)));
  return Response.json({ cuenta }, { status: 201 });
});

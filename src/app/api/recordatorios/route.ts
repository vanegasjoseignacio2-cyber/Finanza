import { crearRecordatorio, listarMovimientos, listarRecordatorios } from "@/lib/datos";
import { datosRecordatorio } from "@/lib/entradas";
import { hoyISO } from "@/lib/fechas";
import { calcularRecordatorios } from "@/lib/finanzas";
import { protegido } from "@/lib/seguridad";
import { leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export const GET = protegido(async () => {
  const hoy = hoyISO();
  const [recordatorios, movimientos] = await Promise.all([
    listarRecordatorios(),
    listarMovimientos({ mes: hoy.slice(0, 7) }),
  ]);
  return Response.json({ recordatorios: calcularRecordatorios(recordatorios, movimientos, hoy) });
});

export const POST = protegido(async (request) => {
  const recordatorio = await crearRecordatorio(datosRecordatorio(await leerJson(request)));
  return Response.json({ recordatorio }, { status: 201 });
});

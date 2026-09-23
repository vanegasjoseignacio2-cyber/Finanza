import { crearMovimiento, listarMovimientos } from "@/lib/datos";
import { datosMovimiento } from "@/lib/entradas";
import { esMesValido } from "@/lib/fechas";
import { protegido } from "@/lib/seguridad";
import type { TipoMovimiento } from "@/lib/types";
import { leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

const TIPOS = new Set(["gasto", "ingreso", "ahorro", "retiro", "transferencia"]);

export const GET = protegido(async (request) => {
  const p = new URL(request.url).searchParams;
  const mes = p.get("mes");
  const tipo = p.get("tipo");
  const q = p.get("q")?.trim().slice(0, 60);
  const movimientos = await listarMovimientos({
    mes: esMesValido(mes) ? mes : undefined,
    tipo: tipo && TIPOS.has(tipo) ? (tipo as TipoMovimiento) : undefined,
    categoria: p.get("categoria") || undefined,
    cuentaId: p.get("cuenta") || undefined,
    q: q || undefined,
  });
  return Response.json({ movimientos });
});

export const POST = protegido(async (request) => {
  const movimiento = await crearMovimiento(datosMovimiento(await leerJson(request)));
  return Response.json({ movimiento }, { status: 201 });
});

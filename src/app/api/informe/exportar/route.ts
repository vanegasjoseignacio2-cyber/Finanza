import { calcularInforme, esPeriodoInforme } from "@/lib/informe";
import { construirLibroInforme } from "@/lib/informe-excel";
import { leerGastosInforme, listarCuentas, obtenerCatalogo } from "@/lib/datos";
import { esMesValido, hoyISO, mesActual } from "@/lib/fechas";
import { protegido } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

/** Descarga el informe de gastos de un periodo como libro de Excel (.xlsx). */
export const GET = protegido(async (request) => {
  const params = new URL(request.url).searchParams;
  const mes = params.get("mes");
  const hasta = mes && esMesValido(mes) ? mes : mesActual();
  const pedido = params.get("periodo");
  const periodo = esPeriodoInforme(pedido) ? pedido : "mes";
  const hoy = hoyISO();

  const [lectura, cuentas, catalogo] = await Promise.all([leerGastosInforme(periodo, hasta), listarCuentas(), obtenerCatalogo()]);
  const informe = calcularInforme({ ...lectura, hasta, hoy });
  const archivo = await construirLibroInforme({ informe, gastos: lectura.gastos, catalogo, cuentas, hoy });

  const nombre = informe.meses === 1 ? `informe-gastos-${informe.hasta}` : `informe-gastos-${informe.desde}-a-${informe.hasta}`;
  return new Response(archivo.buffer as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${nombre}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}, { cubo: "descarga", max: 10 });

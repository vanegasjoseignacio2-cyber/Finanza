import { etiquetaCategoria } from "@/lib/categorias";
import { listarMovimientos } from "@/lib/datos";
import { hoyISO } from "@/lib/fechas";
import { respuestaError } from "@/lib/validacion";

export const dynamic = "force-dynamic";

function celda(valor: string | number): string {
  let texto = String(valor);
  // Excel y Sheets ejecutan lo que empieza por = + - @: se neutraliza.
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const movimientos = await listarMovimientos({ limite: 10_000 });
    const filas = [
      ["fecha", "tipo", "categoria", "monto", "nota"].map(celda).join(","),
      ...movimientos.map((m) =>
        [
          m.fecha,
          m.tipo,
          etiquetaCategoria(m.categoria),
          m.monto,
          m.nota,
        ]
          .map(celda)
          .join(","),
      ),
    ];
    // El BOM hace que Excel abra los acentos correctamente.
    const csv = `﻿${filas.join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="finanza-${hoyISO()}.csv"`,
      },
    });
  } catch (error) {
    return respuestaError(error);
  }
}

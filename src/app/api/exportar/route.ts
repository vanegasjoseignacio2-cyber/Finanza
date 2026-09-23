import { listarMovimientos, listarCuentas, listarMetas, obtenerCatalogo } from "@/lib/datos";
import { hoyISO } from "@/lib/fechas";
import { protegido } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

function celda(valor: string | number): string {
  let texto = String(valor);
  // Excel y Sheets ejecutan lo que empieza por = + - @: se neutraliza.
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export const GET = protegido(async () => {
  const [movimientos, cuentas, metas, catalogo] = await Promise.all([
    listarMovimientos({ limite: 100_000 }),
    listarCuentas(),
    listarMetas(),
    obtenerCatalogo(),
  ]);
  const cuenta = new Map(cuentas.map((c) => [c.id, c.nombre]));
  const meta = new Map(metas.map((m) => [m.id, m.nombre]));

  const filas = [
    ["fecha", "tipo", "categoria", "monto", "cuenta", "cuenta_destino", "meta", "nota"].map(celda).join(","),
    ...movimientos.map((m) =>
      [
        m.fecha,
        m.tipo,
        catalogo.etiqueta(m.categoria),
        m.monto,
        cuenta.get(m.cuentaId) ?? "",
        m.cuentaDestinoId ? (cuenta.get(m.cuentaDestinoId) ?? "") : "",
        m.metaId ? (meta.get(m.metaId) ?? "") : "",
        m.nota,
      ]
        .map(celda)
        .join(","),
    ),
  ];
  // El BOM hace que Excel abra los acentos correctamente.
  return new Response(`﻿${filas.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="finanza-${hoyISO()}.csv"`,
    },
  });
});

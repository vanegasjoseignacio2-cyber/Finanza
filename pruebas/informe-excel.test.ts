import assert from "node:assert/strict";
import { describe, it } from "node:test";
import ExcelJS from "exceljs";
import { CATALOGO_BASE } from "../src/lib/categorias";
import { calcularInforme } from "../src/lib/informe";
import { construirLibroInforme } from "../src/lib/informe-excel";
import { cuenta, movimiento } from "./fabricas";

const gasto = (categoria: string, monto: number, fecha: string, extra: Partial<Parameters<typeof movimiento>[0]> = {}) =>
  movimiento({ tipo: "gasto", categoria, monto, fecha, cuentaId: "principal", ...extra });

async function leer(buffer: Uint8Array) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as unknown as ArrayBuffer);
  return libro;
}

describe("Excel del informe de gastos", () => {
  const gastos = [
    gasto("mercado", 300_000, "2026-10-03", { nota: "Éxito" }),
    gasto("mercado", 100_000, "2026-09-10"),
    gasto("arriendo", 500_000, "2026-10-07", { nota: "Arriendo", recurrenteId: "r1" }),
    gasto("ocio", 80_000, "2026-09-15", { cuota: 2, cuotas: 6 }),
  ];
  const anteriores = [gasto("mercado", 200_000, "2026-07-12")];
  const cuentas = [cuenta({ id: "principal", nombre: "Principal" })];
  const informe = calcularInforme({ gastos, anteriores, desde: "2026-09", hasta: "2026-10", hoy: "2026-10-20" });
  const datos = { informe, gastos, catalogo: CATALOGO_BASE, cuentas, hoy: "2026-10-20" };

  it("arma un libro con resumen, categoría por mes y detalle de gastos", async () => {
    const libro = await leer(await construirLibroInforme(datos));
    assert.deepEqual(libro.worksheets.map((h) => h.name), ["Resumen", "Categoría por mes", "Gastos"]);
  });

  it("el resumen ordena las categorías de mayor a menor y los totales son fórmulas que cuadran", async () => {
    const hoja = (await leer(await construirLibroInforme(datos))).getWorksheet("Resumen")!;
    assert.equal(hoja.getCell("A1").value, "Informe de gastos");
    assert.equal(hoja.getCell("A2").value, "Septiembre – octubre 2026");

    let filaCategorias = 0;
    hoja.eachRow((fila, n) => {
      if (fila.getCell(2).value === "Categoría") filaCategorias = n;
    });
    assert.ok(filaCategorias > 0, "encuentra la tabla de categorías");
    const nombres = [1, 2, 3].map((k) => hoja.getCell(filaCategorias + k, 2).value);
    assert.deepEqual(nombres, ["Arriendo", "Mercado", "Ocio"]);
    assert.equal(hoja.getCell(filaCategorias + 1, 3).value, 500_000);

    const total = hoja.getRow(filaCategorias + 4);
    assert.equal(total.getCell(2).value, "Total");
    const celdaTotal = total.getCell(3).value as { formula: string; result: number };
    assert.equal(celdaTotal.formula, `SUM(C${filaCategorias + 1}:C${filaCategorias + 3})`);
    assert.equal(celdaTotal.result, 980_000);
  });

  it("la matriz categoría por mes reparte cada gasto en su mes", async () => {
    const hoja = (await leer(await construirLibroInforme(datos))).getWorksheet("Categoría por mes")!;
    assert.deepEqual([1, 2, 3, 4].map((c) => hoja.getCell(1, c).value), ["Categoría", "sep 2026", "oct 2026", "Total"]);
    // Mercado: 100.000 en septiembre y 300.000 en octubre.
    const mercado = [1, 2, 3].map((r) => hoja.getRow(r + 1).getCell(1).value).indexOf("Mercado") + 2;
    assert.equal(hoja.getCell(mercado, 2).value, 100_000);
    assert.equal(hoja.getCell(mercado, 3).value, 300_000);
  });

  it("el detalle trae cada gasto con fecha real, cuenta, cuota y pago fijo, de lo más reciente a lo más viejo", async () => {
    const hoja = (await leer(await construirLibroInforme(datos))).getWorksheet("Gastos")!;
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((c) => hoja.getCell(1, c).value), ["Fecha", "Categoría", "Nota", "Monto", "Cuenta", "Cuota", "Pago fijo"]);
    assert.ok(hoja.getCell(2, 1).value instanceof Date);
    assert.equal((hoja.getCell(2, 1).value as Date).toISOString().slice(0, 10), "2026-10-07");
    assert.equal(hoja.getCell(2, 2).value, "Arriendo");
    assert.equal(hoja.getCell(2, 7).value, "Sí");
    assert.equal(hoja.getCell(2, 5).value, "Principal");
    // El gasto en cuotas dice qué cuota es.
    const filaOcio = [2, 3, 4, 5].find((r) => hoja.getCell(r, 2).value === "Ocio")!;
    assert.equal(hoja.getCell(filaOcio, 6).value, "2/6");
    // Total que respeta filtros.
    const subtotal = hoja.getCell(7, 4).value as { formula: string; result: number };
    assert.equal(subtotal.formula, "SUBTOTAL(109,D2:D5)");
    assert.equal(subtotal.result, 980_000);
  });

  it("un solo mes no lleva la hoja de categoría por mes", async () => {
    const solo = calcularInforme({ gastos: [gastos[0], gastos[2]], desde: "2026-10", hasta: "2026-10", hoy: "2026-10-20" });
    const libro = await leer(await construirLibroInforme({ ...datos, informe: solo, gastos: [gastos[0], gastos[2]] }));
    assert.deepEqual(libro.worksheets.map((h) => h.name), ["Resumen", "Gastos"]);
  });
});

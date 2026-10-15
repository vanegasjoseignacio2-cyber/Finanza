/**
 * Libro de Excel (.xlsx) del informe de gastos, con formato: un resumen con el
 * ranking de categorías, la matriz categoría × mes (si abarca varios meses) y el
 * detalle de cada gasto con filtros. Los totales son fórmulas, así que si se
 * cambia o filtra algo en Excel, siguen cuadrando.
 */
import ExcelJS from "exceljs";
import type { Catalogo } from "./categorias";
import { fechaLarga, mesCorto } from "./fechas";
import { textoPeriodoInforme, type Informe } from "./informe";
import type { Cuenta, Movimiento } from "./types";

const FORMATO_PESOS = '"$" #,##0';
const FORMATO_PORCENTAJE = "0.0%";
const FORMATO_FECHA = "dd/mm/yyyy";

const COLOR_ENCABEZADO = "FF1F2937";
const COLOR_FRANJA = "FFF3F4F6";
const COLOR_TOTAL = "FFE5E7EB";
const COLOR_SUBE = "FFB91C1C";
const COLOR_BAJA = "FF047857";
const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};

export interface DatosLibroInforme {
  informe: Informe;
  /** Todos los gastos del periodo, para el detalle y la matriz por mes. */
  gastos: Movimiento[];
  catalogo: Catalogo;
  cuentas: Cuenta[];
  /** Fecha de hoy (YYYY-MM-DD): "generado el…". */
  hoy: string;
}

const fechaExcel = (fecha: string) => new Date(`${fecha}T12:00:00Z`);

function estilarEncabezado(fila: ExcelJS.Row, desde = 1, hasta = fila.cellCount) {
  fila.height = 22;
  for (let c = desde; c <= hasta; c++) {
    const celda = fila.getCell(c);
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ENCABEZADO } };
    celda.alignment = { vertical: "middle", horizontal: c === desde ? "left" : "center", wrapText: true };
    celda.border = BORDE;
  }
}

function estilarCuerpo(fila: ExcelJS.Row, indice: number, desde: number, hasta: number) {
  for (let c = desde; c <= hasta; c++) {
    const celda = fila.getCell(c);
    celda.border = BORDE;
    if (indice % 2 === 1) celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FRANJA } };
  }
}

function estilarTotal(fila: ExcelJS.Row, desde: number, hasta: number) {
  for (let c = desde; c <= hasta; c++) {
    const celda = fila.getCell(c);
    celda.font = { bold: true };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TOTAL } };
    celda.border = { ...BORDE, top: { style: "medium", color: { argb: "FF6B7280" } } };
  }
}

/** Letra de la columna de Excel (1 → A). */
const col = (n: number) => {
  let texto = "";
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) texto = String.fromCharCode(65 + ((k - 1) % 26)) + texto;
  return texto;
};

function hojaResumen(libro: ExcelJS.Workbook, d: DatosLibroInforme) {
  const { informe: i, catalogo } = d;
  const hoja = libro.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  [6, 26, 17, 13, 10, 19, 19, 12].forEach((ancho, k) => (hoja.getColumn(k + 1).width = ancho));

  hoja.mergeCells("A1:H1");
  hoja.getCell("A1").value = "Informe de gastos";
  hoja.getCell("A1").font = { bold: true, size: 20 };
  hoja.getRow(1).height = 30;
  hoja.mergeCells("A2:H2");
  hoja.getCell("A2").value = textoPeriodoInforme(i);
  hoja.getCell("A2").font = { size: 13, color: { argb: "FF374151" } };
  hoja.mergeCells("A3:H3");
  hoja.getCell("A3").value = `Generado el ${fechaLarga(d.hoy)}`;
  hoja.getCell("A3").font = { size: 10, color: { argb: "FF6B7280" } };

  // Cifras clave.
  let fila = 5;
  hoja.getCell(`A${fila}`).value = "Cifras clave";
  hoja.getCell(`A${fila}`).font = { bold: true, size: 13 };
  fila++;
  const dato = (etiqueta: string, valor: number, formato: string, nota?: string) => {
    hoja.getCell(`B${fila}`).value = etiqueta;
    const celda = hoja.getCell(`C${fila}`);
    celda.value = valor;
    celda.numFmt = formato;
    celda.font = { bold: true };
    celda.alignment = { horizontal: "right" };
    if (nota) {
      hoja.mergeCells(`D${fila}:H${fila}`);
      hoja.getCell(`D${fila}`).value = nota;
      hoja.getCell(`D${fila}`).font = { color: { argb: "FF6B7280" } };
    }
    for (const c of ["B", "C", "D"]) hoja.getCell(`${c}${fila}`).border = { bottom: { style: "hair", color: { argb: "FFD1D5DB" } } };
    fila++;
  };
  dato("Total gastado", i.total, FORMATO_PESOS);
  dato("Gastos registrados", i.cantidad, "#,##0");
  if (i.promedioDiario !== null) dato("Promedio por día", i.promedioDiario, FORMATO_PESOS);
  if (i.meses > 1) dato("Promedio por mes", i.promedioMensual, FORMATO_PESOS);
  if (i.anterior !== null) {
    dato("Periodo anterior", i.anterior, FORMATO_PESOS, "Mismo número de meses, justo antes de este periodo.");
    if (i.variacion !== null) dato("Cambio frente al anterior", (i.total - i.anterior) / i.anterior, FORMATO_PORCENTAJE);
  }
  const mayor = i.mayores[0];
  if (mayor) {
    dato("Gasto más grande", mayor.monto, FORMATO_PESOS, `${mayor.nota || catalogo.etiqueta(mayor.categoria)} · ${fechaLarga(mayor.fecha)}`);
  }

  // Ranking de categorías.
  fila++;
  hoja.getCell(`A${fila}`).value = "Gasto por categoría";
  hoja.getCell(`A${fila}`).font = { bold: true, size: 13 };
  fila++;
  const comparar = i.anterior !== null;
  const encabezados = ["#", "Categoría", "Total", "% del total", "Gastos", "Promedio por gasto", ...(comparar ? ["Periodo anterior", "Cambio"] : [])];
  const cabecera = hoja.getRow(fila);
  encabezados.forEach((texto, k) => (cabecera.getCell(k + 1).value = texto));
  estilarEncabezado(cabecera, 1, encabezados.length);
  const ultimaColumna = encabezados.length;
  const primera = fila + 1;
  const ultima = fila + i.categorias.length;
  const filaTotal = ultima + 1;

  i.categorias.forEach((c, k) => {
    const r = hoja.getRow(primera + k);
    const n = primera + k;
    r.getCell(1).value = k + 1;
    r.getCell(2).value = catalogo.etiqueta(c.categoria);
    r.getCell(3).value = c.total;
    r.getCell(4).value = { formula: `IFERROR(C${n}/$C$${filaTotal},0)`, result: i.total ? c.total / i.total : 0 };
    r.getCell(5).value = c.cantidad;
    r.getCell(6).value = { formula: `IFERROR(C${n}/E${n},0)`, result: c.cantidad ? c.total / c.cantidad : 0 };
    if (comparar) {
      r.getCell(7).value = c.anterior ?? 0;
      r.getCell(8).value = {
        formula: `IF(G${n}=0,"Nuevo",C${n}/G${n}-1)`,
        result: (c.anterior ?? 0) === 0 ? "Nuevo" : c.total / (c.anterior ?? 1) - 1,
      };
    }
    estilarCuerpo(r, k, 1, ultimaColumna);
    r.getCell(1).alignment = { horizontal: "center" };
    for (const n2 of [3, 6, 7]) r.getCell(n2).numFmt = FORMATO_PESOS;
    r.getCell(4).numFmt = FORMATO_PORCENTAJE;
    r.getCell(5).numFmt = "#,##0";
    r.getCell(8).numFmt = FORMATO_PORCENTAJE;
    r.getCell(8).alignment = { horizontal: "right" };
  });

  const total = hoja.getRow(filaTotal);
  total.getCell(2).value = "Total";
  total.getCell(3).value = { formula: `SUM(C${primera}:C${ultima})`, result: i.total };
  total.getCell(4).value = { formula: `IFERROR(C${filaTotal}/C${filaTotal},0)`, result: i.total ? 1 : 0 };
  total.getCell(5).value = { formula: `SUM(E${primera}:E${ultima})`, result: i.cantidad };
  total.getCell(6).value = { formula: `IFERROR(C${filaTotal}/E${filaTotal},0)`, result: i.cantidad ? i.total / i.cantidad : 0 };
  if (comparar) {
    total.getCell(7).value = { formula: `SUM(G${primera}:G${ultima})`, result: i.anterior ?? 0 };
    total.getCell(8).value = {
      formula: `IF(G${filaTotal}=0,"",C${filaTotal}/G${filaTotal}-1)`,
      result: i.anterior ? i.total / i.anterior - 1 : "",
    };
  }
  estilarTotal(total, 1, ultimaColumna);
  for (const n2 of [3, 6, 7]) total.getCell(n2).numFmt = FORMATO_PESOS;
  total.getCell(4).numFmt = FORMATO_PORCENTAJE;
  total.getCell(5).numFmt = "#,##0";
  total.getCell(8).numFmt = FORMATO_PORCENTAJE;

  if (comparar && i.categorias.length > 0) {
    // Subir el gasto es malo (rojo); bajarlo, bueno (verde).
    hoja.addConditionalFormatting({
      ref: `H${primera}:H${filaTotal}`,
      // Con ISNUMBER, el texto "Nuevo" no se pinta (para Excel un texto es "mayor que 0").
      rules: [
        { type: "expression", formulae: [`AND(ISNUMBER(H${primera}),H${primera}>0)`], priority: 1, style: { font: { color: { argb: COLOR_SUBE } } } },
        { type: "expression", formulae: [`AND(ISNUMBER(H${primera}),H${primera}<0)`], priority: 2, style: { font: { color: { argb: COLOR_BAJA } } } },
      ],
    });
  }
  hoja.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

function hojaCategoriaPorMes(libro: ExcelJS.Workbook, d: DatosLibroInforme) {
  const { informe: i, catalogo, gastos } = d;
  const hoja = libro.addWorksheet("Categoría por mes", { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
  const meses = i.porMes;
  const columnaTotal = meses.length + 2;
  hoja.getColumn(1).width = 26;
  for (let c = 2; c <= columnaTotal; c++) hoja.getColumn(c).width = 15;

  const cabecera = hoja.getRow(1);
  cabecera.getCell(1).value = "Categoría";
  meses.forEach((m, k) => (cabecera.getCell(k + 2).value = `${mesCorto(m.mes)} ${m.mes.slice(0, 4)}`));
  cabecera.getCell(columnaTotal).value = "Total";
  estilarEncabezado(cabecera, 1, columnaTotal);

  const acumulado = new Map<string, number>();
  for (const g of gastos) acumulado.set(`${g.categoria}|${g.mes}`, (acumulado.get(`${g.categoria}|${g.mes}`) ?? 0) + g.monto);

  i.categorias.forEach((c, k) => {
    const n = k + 2;
    const r = hoja.getRow(n);
    r.getCell(1).value = catalogo.etiqueta(c.categoria);
    meses.forEach((m, j) => {
      r.getCell(j + 2).value = acumulado.get(`${c.categoria}|${m.mes}`) ?? 0;
    });
    r.getCell(columnaTotal).value = { formula: `SUM(B${n}:${col(columnaTotal - 1)}${n})`, result: c.total };
    estilarCuerpo(r, k, 1, columnaTotal);
    for (let x = 2; x <= columnaTotal; x++) r.getCell(x).numFmt = FORMATO_PESOS;
    r.getCell(columnaTotal).font = { bold: true };
  });

  const filaTotal = i.categorias.length + 2;
  const total = hoja.getRow(filaTotal);
  total.getCell(1).value = "Total";
  for (let x = 2; x <= columnaTotal; x++) {
    const letra = col(x);
    const resultado = x === columnaTotal ? i.total : (meses[x - 2]?.total ?? 0);
    total.getCell(x).value = { formula: `SUM(${letra}2:${letra}${filaTotal - 1})`, result: resultado };
    total.getCell(x).numFmt = FORMATO_PESOS;
  }
  estilarTotal(total, 1, columnaTotal);
  hoja.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

function hojaGastos(libro: ExcelJS.Workbook, d: DatosLibroInforme) {
  const { catalogo, gastos, cuentas } = d;
  const hoja = libro.addWorksheet("Gastos", { views: [{ state: "frozen", ySplit: 1 }] });
  const columnas = [
    { titulo: "Fecha", ancho: 13 },
    { titulo: "Categoría", ancho: 22 },
    { titulo: "Nota", ancho: 38 },
    { titulo: "Monto", ancho: 16 },
    { titulo: "Cuenta", ancho: 18 },
    { titulo: "Cuota", ancho: 11 },
    { titulo: "Pago fijo", ancho: 12 },
  ];
  columnas.forEach((c, k) => (hoja.getColumn(k + 1).width = c.ancho));
  const cabecera = hoja.getRow(1);
  columnas.forEach((c, k) => (cabecera.getCell(k + 1).value = c.titulo));
  estilarEncabezado(cabecera, 1, columnas.length);

  const cuenta = new Map(cuentas.map((c) => [c.id, c.nombre]));
  const ordenados = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.monto - a.monto);
  ordenados.forEach((g, k) => {
    const r = hoja.getRow(k + 2);
    r.getCell(1).value = fechaExcel(g.fecha);
    r.getCell(2).value = catalogo.etiqueta(g.categoria);
    r.getCell(3).value = g.nota;
    r.getCell(4).value = g.monto;
    r.getCell(5).value = cuenta.get(g.cuentaId) ?? "";
    r.getCell(6).value = g.cuota && g.cuotas ? `${g.cuota}/${g.cuotas}` : "";
    r.getCell(7).value = g.recurrenteId ? "Sí" : "";
    estilarCuerpo(r, k, 1, columnas.length);
    r.getCell(1).numFmt = FORMATO_FECHA;
    r.getCell(1).alignment = { horizontal: "center" };
    r.getCell(4).numFmt = FORMATO_PESOS;
    r.getCell(6).alignment = { horizontal: "center" };
    r.getCell(7).alignment = { horizontal: "center" };
  });

  if (ordenados.length > 0) {
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: ordenados.length + 1, column: columnas.length } };
    // SUBTOTAL respeta los filtros: al filtrar por categoría o cuenta, el total cambia con ellos.
    const total = hoja.getRow(ordenados.length + 3);
    total.getCell(3).value = "Total (según el filtro)";
    total.getCell(4).value = { formula: `SUBTOTAL(109,D2:D${ordenados.length + 1})`, result: ordenados.reduce((s, g) => s + g.monto, 0) };
    total.getCell(4).numFmt = FORMATO_PESOS;
    total.getCell(3).alignment = { horizontal: "right" };
    estilarTotal(total, 3, 4);
  }
  hoja.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

/** Arma el .xlsx del informe y lo devuelve listo para descargar. */
export async function construirLibroInforme(d: DatosLibroInforme): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Finanza";
  libro.title = `Informe de gastos · ${textoPeriodoInforme(d.informe)}`;
  libro.created = fechaExcel(d.hoy);

  hojaResumen(libro, d);
  if (d.informe.meses > 1 && d.informe.categorias.length > 0) hojaCategoriaPorMes(libro, d);
  hojaGastos(libro, d);

  return new Uint8Array(await libro.xlsx.writeBuffer());
}

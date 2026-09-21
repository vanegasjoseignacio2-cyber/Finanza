import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { construirCorreoDiario } from "../src/lib/email/plantilla";
import { calcularRecordatorios, recordatoriosParaAvisar } from "../src/lib/finanzas";
import type { Recordatorio, Resumen } from "../src/lib/types";

const resumen: Resumen = {
  mes: "2026-09",
  ingresoBase: 2_000_000,
  ingresosExtra: 0,
  ingresoTotal: 2_000_000,
  gastado: 1_200_000,
  ahorradoMes: 300_000,
  disponible: 500_000,
  ahorroTotal: 4_000_000,
  metaAhorro: 20_000_000,
  metaNombre: "Moto nueva",
  progresoMeta: 20,
  mesesRestantes: 32,
  mesesHastaLimite: null,
  cuotaSugerida: null,
  promedioAhorroMensual: 500_000,
  categorias: [],
  tendencia: [],
  movimientos: [],
  recordatorios: [],
  ajustes: {
    ingresoMensual: 2_000_000,
    metaAhorro: 20_000_000,
    metaNombre: "Moto nueva",
    metaFechaLimite: null,
    email: "yo@ejemplo.com",
    emailActivo: true,
    enviarSiempre: false,
    diasAviso: 3,
    actualizadoEn: "2026-09-01T00:00:00.000Z",
  },
  consejos: ["Aparta el ahorro apenas te paguen."],
};

function recordatorio(parcial: Partial<Recordatorio>): Recordatorio {
  return {
    id: "1",
    titulo: "Arriendo",
    dia: 22,
    categoria: "",
    montoEstimado: 900_000,
    activo: true,
    pagados: [],
    creadoEn: "2026-01-01T00:00:00.000Z",
    ...parcial,
  };
}

describe("construirCorreoDiario", () => {
  const avisos = recordatoriosParaAvisar(
    calcularRecordatorios([recordatorio({})], [], "2026-09-21"),
    3,
  );

  it("resume los pendientes en el asunto", () => {
    const correo = construirCorreoDiario(resumen, avisos, "2026-09-21", "https://app.test");
    assert.match(correo.asunto, /1 pago pendiente/);
  });

  it("cambia el asunto cuando no hay pendientes", () => {
    const correo = construirCorreoDiario(resumen, [], "2026-09-21", "https://app.test");
    assert.match(correo.asunto, /resumen de septiembre 2026/);
    assert.match(correo.html, /No tienes pagos pendientes/);
  });

  it("incluye las cifras del mes en la versión de texto", () => {
    const correo = construirCorreoDiario(resumen, avisos, "2026-09-21", "https://app.test");
    assert.match(correo.texto, /Gastado/);
    assert.match(correo.texto, /https:\/\/app\.test/);
  });

  it("escapa el HTML que venga de los títulos del usuario", () => {
    const peligroso = recordatoriosParaAvisar(
      calcularRecordatorios(
        [recordatorio({ titulo: '<img src=x onerror="alert(1)">' })],
        [],
        "2026-09-21",
      ),
      3,
    );
    const correo = construirCorreoDiario(resumen, peligroso, "2026-09-21", "https://app.test");
    assert.ok(!correo.html.includes("<img src=x"));
    assert.ok(correo.html.includes("&lt;img src=x"));
  });

  it("omite el bloque de meta cuando no hay meta definida", () => {
    const correo = construirCorreoDiario(
      { ...resumen, metaAhorro: 0 },
      avisos,
      "2026-09-21",
      "https://app.test",
    );
    assert.ok(!correo.html.includes("Moto nueva"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { construirCorreoDiario } from "../src/lib/email/plantilla";
import { componerResumen, recordatoriosParaAvisar } from "../src/lib/finanzas";
import { entrada, meta, movimiento, recordatorio } from "./fabricas";

function correo(parcial: Parameters<typeof entrada>[0] = {}, conRespaldo = false) {
  const resumen = componerResumen(entrada(parcial));
  const avisos = recordatoriosParaAvisar(resumen.recordatorios, 3);
  return construirCorreoDiario({ resumen, avisos, hoy: "2026-09-21", urlApp: "https://app.test", conRespaldo });
}

describe("correo diario", () => {
  it("abre con lo que se puede gastar por día, no con el ingreso", () => {
    const c = correo();
    assert.match(c.asunto, /por día/);
    assert.match(c.texto.split("\n")[2], /por día/);
  });

  it("descuenta en el desglose los pagos fijos pendientes", () => {
    const c = correo({ recordatorios: [recordatorio({ titulo: "Plan celular", dia: 28, montoEstimado: 54_900 })] });
    assert.match(c.texto, /Pagos fijos pendientes: − \$\s?54\.900/);
  });

  it("cuando no alcanza, lo dice en el asunto y en el titular", () => {
    const c = correo({ movimientosMes: [movimiento({ monto: 2_500_000 })] });
    assert.match(c.asunto, /te faltan/);
    assert.match(c.html, /Te faltan/);
  });

  it("destaca los pagos vencidos", () => {
    const c = correo({ recordatorios: [recordatorio({ titulo: "Arriendo", dia: 5 })] });
    assert.match(c.asunto, /1 pago vencido/);
    assert.match(c.texto, /Vencido hace 16 días/);
  });

  it("no repite en 'Para revisar' lo que ya dicen el titular y la lista de pagos", () => {
    const c = correo({
      movimientosMes: [movimiento({ monto: 2_500_000 })],
      recordatorios: [recordatorio({ dia: 5 })],
    });
    assert.ok(!/Para revisar:[\s\S]*venció/.test(c.texto));
    assert.ok(!/Para revisar:[\s\S]*te faltan/.test(c.texto));
  });

  it("menciona el respaldo solo cuando va adjunto", () => {
    assert.ok(!/respaldo/.test(correo().texto));
    assert.match(correo({}, true).texto, /respaldo semanal/);
  });

  it("muestra las metas con su progreso", () => {
    const c = correo({ metas: [meta({ nombre: "Moto nueva" })] });
    assert.match(c.texto, /Moto nueva: \$\s?0 de \$\s?20\.000\.000 \(0%\)/);
  });

  it("escapa el HTML de los títulos del usuario", () => {
    const c = correo({ recordatorios: [recordatorio({ titulo: '<img src=x onerror="alert(1)">', dia: 22 })] });
    assert.ok(!c.html.includes("<img src=x"));
    assert.ok(c.html.includes("&lt;img src=x"));
  });
});

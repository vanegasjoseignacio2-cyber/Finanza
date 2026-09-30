import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { construirCorreoDiario } from "../src/lib/email/plantilla";
import { componerResumen, recordatoriosParaAvisar } from "../src/lib/finanzas";
import { entrada, recordatorio } from "./fabricas";

function correo(parcial: Parameters<typeof entrada>[0] = {}, conRespaldo = false) {
  const resumen = componerResumen(entrada(parcial));
  const avisos = recordatoriosParaAvisar(resumen.recordatorios, 3);
  return construirCorreoDiario({ avisos, hoy: "2026-09-21", urlApp: "https://app.test/", conRespaldo });
}

describe("correo diario: todo al día", () => {
  it("sin pagos por vencer invita a registrar los gastos de hoy", () => {
    const c = correo();
    assert.match(c.asunto, /todo al día · registra tus gastos de hoy/);
    assert.match(c.html, /Todo al día/);
    assert.match(c.html, /registra tus gastos de hoy/);
    assert.match(c.texto, /Todo al día: no tienes pagos por vencer/);
  });

  it("el botón lleva directo a anotar un gasto", () => {
    const c = correo();
    assert.match(c.html, /href="https:\/\/app\.test\/nuevo"/);
    assert.match(c.texto, /Registrar mis gastos: https:\/\/app\.test\/nuevo/);
  });

  it("no mezcla nada de pagos", () => {
    const c = correo();
    assert.ok(!/Por pagar|Total estimado/.test(c.html + c.texto));
  });
});

describe("correo diario: pagos por atender", () => {
  it("habla solo de pagos: sin invitación a registrar gastos, libre, metas ni alertas", () => {
    const c = correo({ recordatorios: [recordatorio({ titulo: "Plan celular", dia: 22, montoEstimado: 54_900 })] });
    assert.match(c.html, /Por pagar/);
    assert.ok(!/registra tus gastos|Todo al día|\/nuevo/.test(c.html + c.texto));
    assert.ok(!/libre|Metas|Para revisar/i.test(c.html + c.texto));
  });

  it("lista cada pago con su monto y suma el total", () => {
    const c = correo({
      recordatorios: [
        recordatorio({ titulo: "Plan celular", dia: 22, montoEstimado: 54_900 }),
        recordatorio({ titulo: "Internet", dia: 23, montoEstimado: 89_900 }),
      ],
    });
    assert.equal(c.asunto, "Finanza · 2 pagos por vencer");
    assert.match(c.texto, /Plan celular · 22 sep · Vence mañana · \$\s?54\.900/);
    assert.match(c.texto, /Total estimado: \$\s?144\.800/);
  });

  it("el botón lleva a los pagos fijos", () => {
    const c = correo({ recordatorios: [recordatorio({ dia: 22 })] });
    assert.match(c.html, /href="https:\/\/app\.test\/presupuesto#pagos-fijos"/);
  });

  it("destaca los pagos vencidos", () => {
    const c = correo({ recordatorios: [recordatorio({ titulo: "Arriendo", dia: 5 })] });
    assert.equal(c.asunto, "Finanza · 1 pago vencido");
    assert.match(c.texto, /Vencido hace 16 días/);
  });

  it("escapa el HTML de los títulos del usuario", () => {
    const c = correo({ recordatorios: [recordatorio({ titulo: '<img src=x onerror="alert(1)">', dia: 22 })] });
    assert.ok(!c.html.includes("<img src=x"));
    assert.ok(c.html.includes("&lt;img src=x"));
  });
});

describe("respaldo semanal", () => {
  it("se menciona solo cuando va adjunto, en los dos correos", () => {
    assert.ok(!/respaldo/.test(correo().texto));
    assert.match(correo({}, true).texto, /respaldo semanal/);
    const conPago = { recordatorios: [recordatorio({ dia: 22 })] };
    assert.ok(!/respaldo/.test(correo(conPago).texto));
    assert.match(correo(conPago, true).texto, /respaldo semanal/);
  });
});

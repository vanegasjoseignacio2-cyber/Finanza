import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { celdasDelMes, diaConAgenda, resumenDelMes, type DiaCalendario } from "../src/lib/calendario";
import { calcularRecordatorios } from "../src/lib/finanzas";
import type { GastoAgendado } from "../src/lib/types";
import { recordatorio } from "./fabricas";

const HOY = "2026-10-05";

function dia(celdas: ReturnType<typeof celdasDelMes>, fecha: string): DiaCalendario {
  const encontrado = celdas.find((c): c is DiaCalendario => c !== null && c.fecha === fecha);
  assert.ok(encontrado, `el día ${fecha} existe en la grilla`);
  return encontrado;
}

function cuota(parcial: Partial<GastoAgendado> = {}): GastoAgendado {
  return {
    id: "g1",
    fecha: "2026-10-20",
    monto: 120_000,
    categoria: "otros",
    nota: "Nevera",
    cuentaId: "tarjeta",
    cuota: 2,
    cuotas: 12,
    ...parcial,
  };
}

describe("calendario: gastos programados una sola vez", () => {
  const programado = recordatorio({ titulo: "Cumpleaños de mamá", dia: 20, fecha: "2026-10-20", montoEstimado: 150_000 });
  const calculados = calcularRecordatorios([programado], [], HOY);

  it("aparece en su día, en el mes de la fecha", () => {
    const d = dia(celdasDelMes("2026-10", HOY, calculados), "2026-10-20");
    assert.deepEqual(d.pagos.map((p) => p.titulo), ["Cumpleaños de mamá"]);
    assert.equal(diaConAgenda(d), true);
  });

  it("solo aparece en su mes, no se repite en los demás", () => {
    const noviembre = celdasDelMes("2026-11", HOY, calculados);
    assert.equal(resumenDelMes(noviembre).pagos, 0);
    const octubre = celdasDelMes("2026-10", HOY, calculados);
    assert.equal(resumenDelMes(octubre).pagos, 1);
  });

  it("programado para el mes que viene se ve al pasar a ese mes", () => {
    const futuro = recordatorio({ titulo: "Aniversario", dia: 14, fecha: "2026-11-14", montoEstimado: 0 });
    const lista = calcularRecordatorios([futuro], [], HOY);
    assert.equal(dia(celdasDelMes("2026-11", HOY, lista), "2026-11-14").pagos.length, 1);
  });

  it("ya pagado sigue apareciendo (con su estado), no desaparece", () => {
    const pagado = recordatorio({ titulo: "Regalo", dia: 20, fecha: "2026-10-20", pagados: ["2026-10"] });
    const d = dia(celdasDelMes("2026-10", HOY, calcularRecordatorios([pagado], [], HOY)), "2026-10-20");
    assert.equal(d.pagos.length, 1);
    assert.equal(d.pagos[0].pagado, true);
  });
});

describe("calendario: cuotas de tarjeta y gastos con fecha", () => {
  it("cada cuota cae en su día, en el mes que le toca", () => {
    const cuotas = [cuota({ id: "a", fecha: "2026-10-20", cuota: 2 }), cuota({ id: "b", fecha: "2026-11-20", cuota: 3 })];
    const octubre = celdasDelMes("2026-10", HOY, [], cuotas);
    const noviembre = celdasDelMes("2026-11", HOY, [], cuotas);
    assert.deepEqual(dia(octubre, "2026-10-20").gastos.map((g) => g.id), ["a"]);
    assert.deepEqual(dia(noviembre, "2026-11-20").gastos.map((g) => g.id), ["b"]);
    assert.equal(dia(octubre, "2026-10-21").gastos.length, 0);
  });

  it("un día con cuota tiene algo que mostrar aunque no haya festivo ni pagos", () => {
    const d = dia(celdasDelMes("2026-10", HOY, [], [cuota()]), "2026-10-20");
    assert.equal(d.pagos.length, 0);
    assert.equal(diaConAgenda(d), true);
    assert.equal(diaConAgenda(dia(celdasDelMes("2026-10", HOY, [], [cuota()]), "2026-10-21")), false);
  });

  it("marca como pasado lo anterior a hoy", () => {
    const celdas = celdasDelMes("2026-10", HOY, [], []);
    assert.equal(dia(celdas, "2026-10-04").pasado, true);
    assert.equal(dia(celdas, HOY).pasado, false);
    assert.equal(dia(celdas, "2026-10-06").pasado, false);
  });

  it("el resumen del mes cuenta las cuotas y su total, y aparte los gastos anotados", () => {
    const gastos = [
      cuota({ id: "a", fecha: "2026-10-20", monto: 120_000 }),
      cuota({ id: "b", fecha: "2026-10-25", monto: 80_000, cuota: 5 }),
      cuota({ id: "c", fecha: "2026-10-28", monto: 50_000, cuota: null, cuotas: null, nota: "Regalo" }),
      cuota({ id: "d", fecha: "2026-11-20", monto: 999 }),
    ];
    const resumen = resumenDelMes(celdasDelMes("2026-10", HOY, [], gastos));
    assert.equal(resumen.cuotas, 2);
    assert.equal(resumen.totalCuotas, 200_000);
    assert.equal(resumen.gastosAnotados, 1);
  });

  it("sin gastos agendados, la grilla se arma igual que antes", () => {
    const celdas = celdasDelMes("2026-10", HOY, []);
    assert.equal(celdas.length % 7, 0);
    assert.equal(celdas.filter((c) => c !== null).length, 31);
    assert.ok(celdas.every((c) => c === null || c.gastos.length === 0));
  });
});

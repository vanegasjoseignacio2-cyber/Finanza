import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diasDelMes,
  diasEntre,
  esFechaValida,
  esMesValido,
  mesCorto,
  nombreMes,
  proximoVencimiento,
  sumarMeses,
} from "../src/lib/fechas";

describe("sumarMeses", () => {
  it("avanza dentro del mismo año", () => {
    assert.equal(sumarMeses("2026-03", 2), "2026-05");
  });

  it("cruza el fin de año hacia adelante y hacia atrás", () => {
    assert.equal(sumarMeses("2026-11", 3), "2027-02");
    assert.equal(sumarMeses("2026-01", -1), "2025-12");
    assert.equal(sumarMeses("2026-01", -13), "2024-12");
  });
});

describe("diasDelMes", () => {
  it("resuelve febrero bisiesto y no bisiesto", () => {
    assert.equal(diasDelMes("2024-02"), 29);
    assert.equal(diasDelMes("2026-02"), 28);
    assert.equal(diasDelMes("2026-04"), 30);
  });
});

describe("diasEntre", () => {
  it("cuenta días completos", () => {
    assert.equal(diasEntre("2026-09-21", "2026-09-24"), 3);
    assert.equal(diasEntre("2026-09-21", "2026-09-21"), 0);
    assert.equal(diasEntre("2026-09-21", "2026-09-19"), -2);
  });

  it("no se descuadra al cruzar un cambio de horario", () => {
    assert.equal(diasEntre("2026-03-01", "2026-04-01"), 31);
  });
});

describe("proximoVencimiento", () => {
  it("usa este mes cuando el día todavía no llega", () => {
    assert.equal(proximoVencimiento(25, "2026-09-21"), "2026-09-25");
  });

  it("incluye el día de hoy", () => {
    assert.equal(proximoVencimiento(21, "2026-09-21"), "2026-09-21");
  });

  it("salta al mes siguiente cuando el día ya pasó", () => {
    assert.equal(proximoVencimiento(5, "2026-09-21"), "2026-10-05");
  });

  it("ajusta el día 31 a la longitud real del mes", () => {
    assert.equal(proximoVencimiento(31, "2026-01-31"), "2026-01-31");
    assert.equal(proximoVencimiento(31, "2026-02-01"), "2026-02-28");
  });

  it("cruza el fin de año", () => {
    assert.equal(proximoVencimiento(5, "2026-12-20"), "2027-01-05");
  });
});

describe("validadores", () => {
  it("acepta solo meses con formato AAAA-MM", () => {
    assert.equal(esMesValido("2026-09"), true);
    assert.equal(esMesValido("2026-13"), false);
    assert.equal(esMesValido("2026-9"), false);
    assert.equal(esMesValido(null), false);
  });

  it("rechaza fechas que no existen", () => {
    assert.equal(esFechaValida("2026-02-29"), false);
    assert.equal(esFechaValida("2024-02-29"), true);
    assert.equal(esFechaValida("2026-13-01"), false);
    assert.equal(esFechaValida(42), false);
  });
});

describe("etiquetas", () => {
  it("nombra meses en español", () => {
    assert.equal(nombreMes("2026-09"), "septiembre 2026");
    assert.equal(mesCorto("2026-01"), "ene");
  });
});

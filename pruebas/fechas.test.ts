import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diasDelMes,
  diasEntre,
  esFechaValida,
  esMesValido,
  horaActual,
  mesCorto,
  nombreMes,
  proximoVencimiento,
  sumarMeses,
  sumarMesesAFecha,
  textoHora,
  ZONA,
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

describe("sumarMesesAFecha", () => {
  it("mantiene el día y cruza de año", () => {
    assert.equal(sumarMesesAFecha("2026-09-15", 0), "2026-09-15");
    assert.equal(sumarMesesAFecha("2026-09-15", 4), "2027-01-15");
    assert.equal(sumarMesesAFecha("2026-11-30", 14), "2028-01-30");
  });

  it("un día 31 cae el último día de un mes corto y vuelve al 31 después", () => {
    assert.equal(sumarMesesAFecha("2026-01-31", 1), "2026-02-28");
    assert.equal(sumarMesesAFecha("2026-01-31", 2), "2026-03-31");
    assert.equal(sumarMesesAFecha("2028-01-31", 1), "2028-02-29");
  });
});

describe("hora del aviso", () => {
  it("escribe la hora en formato de 12 horas", () => {
    assert.equal(textoHora(0), "12:00 a. m.");
    assert.equal(textoHora(7), "7:00 a. m.");
    assert.equal(textoHora(12), "12:00 p. m.");
    assert.equal(textoHora(15), "3:00 p. m.");
    assert.equal(textoHora(23), "11:00 p. m.");
  });

  it("lee la hora en la zona de la app, no en la del servidor", { skip: ZONA !== "America/Bogota" && "solo aplica con la zona por defecto" }, () => {
    // 12:30 UTC son las 7:30 a. m. en Bogotá (UTC−5, sin horario de verano).
    assert.equal(horaActual(new Date("2026-10-05T12:30:00Z")), 7);
    // Medianoche UTC todavía es la noche anterior en Bogotá.
    assert.equal(horaActual(new Date("2026-10-05T00:10:00Z")), 19);
    // Y 05:00 UTC es la medianoche de Bogotá: la hora es 0, nunca 24.
    assert.equal(horaActual(new Date("2026-10-05T05:00:00Z")), 0);
  });
});

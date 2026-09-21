import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pesos, pesosCompacto, porcentaje, techoBonito } from "../src/lib/dinero";

describe("pesos", () => {
  it("formatea en pesos colombianos sin decimales", () => {
    assert.match(pesos(1_423_500), /1\.423\.500/);
    assert.match(pesos(0), /0/);
  });

  it("redondea en vez de truncar", () => {
    assert.match(pesos(1999.6), /2\.000/);
  });
});

describe("pesosCompacto", () => {
  it("abrevia millones y miles", () => {
    assert.equal(pesosCompacto(1_400_000), "$1,4M");
    assert.equal(pesosCompacto(12_000_000), "$12M");
    assert.equal(pesosCompacto(678_000), "$678k");
    assert.equal(pesosCompacto(950), "$950");
  });
});

describe("techoBonito", () => {
  it("sube al siguiente número redondo", () => {
    assert.equal(techoBonito(1_356_900), 2_000_000);
    assert.equal(techoBonito(678_000), 1_000_000);
    assert.equal(techoBonito(210_000), 250_000);
    assert.equal(techoBonito(2_400_000), 2_500_000);
    assert.equal(techoBonito(4_900), 5_000);
  });

  it("nunca devuelve cero", () => {
    assert.equal(techoBonito(0), 1);
    assert.equal(techoBonito(-50), 1);
  });
});

describe("porcentaje", () => {
  it("evita dividir por cero", () => {
    assert.equal(porcentaje(10, 0), 0);
    assert.equal(porcentaje(25, 200), 13);
  });
});

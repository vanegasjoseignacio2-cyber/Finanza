import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcularInforme,
  esPeriodoInforme,
  rangoAnteriorDelInforme,
  rangoDelInforme,
} from "../src/lib/informe";
import { movimiento } from "./fabricas";

const gasto = (categoria: string, monto: number, fecha = "2026-10-05", nota = "") =>
  movimiento({ tipo: "gasto", categoria, monto, fecha, nota });

describe("informe de gastos: en qué se fue la plata", () => {
  const base = { desde: "2026-10", hasta: "2026-10", hoy: "2026-10-20" };

  it("ordena las categorías de la que más gastaste a la que menos, con su parte del total", () => {
    const r = calcularInforme({
      ...base,
      gastos: [gasto("mercado", 300_000), gasto("mercado", 200_000), gasto("ocio", 100_000), gasto("moto", 400_000)],
    });
    assert.deepEqual(r.categorias.map((c) => c.categoria), ["mercado", "moto", "ocio"]);
    assert.equal(r.total, 1_000_000);
    assert.equal(r.cantidad, 4);
    const [mercado, moto, ocio] = r.categorias;
    assert.deepEqual([mercado.total, mercado.porcentaje, mercado.cantidad, mercado.promedio], [500_000, 50, 2, 250_000]);
    assert.deepEqual([moto.total, moto.porcentaje], [400_000, 40]);
    assert.deepEqual([ocio.total, ocio.porcentaje], [100_000, 10]);
  });

  it("solo cuenta gastos: ingresos, ahorros y transferencias no entran", () => {
    const r = calcularInforme({
      ...base,
      gastos: [
        gasto("mercado", 100_000),
        movimiento({ tipo: "ingreso", categoria: "sueldo", monto: 2_000_000 }),
        movimiento({ tipo: "ahorro", categoria: "ahorro", monto: 500_000 }),
        movimiento({ tipo: "transferencia", categoria: "transferencia", monto: 300_000 }),
      ],
    });
    assert.equal(r.total, 100_000);
    assert.equal(r.categorias.length, 1);
  });

  it("deja los gastos más grandes de cada categoría y del periodo, de mayor a menor", () => {
    const gastos = [10, 90, 30, 70, 50, 20, 80].map((k) => gasto("mercado", k * 1_000, "2026-10-05", `compra ${k}`));
    const r = calcularInforme({ ...base, gastos: [...gastos, gasto("ocio", 95_000, "2026-10-06", "cine")] });
    assert.deepEqual(r.categorias[0].mayores.map((m) => m.nota), ["compra 90", "compra 80", "compra 70", "compra 50", "compra 30"]);
    assert.equal(r.mayores[0].nota, "cine");
    assert.equal(r.mayores.length, 8);
  });

  it("sin gastos, el informe queda en cero", () => {
    const r = calcularInforme({ ...base, gastos: [] });
    assert.equal(r.total, 0);
    assert.equal(r.categorias.length, 0);
    assert.equal(r.promedioMensual, 0);
  });

  it("ignora lo que cae fuera del periodo", () => {
    const r = calcularInforme({
      ...base,
      gastos: [gasto("mercado", 100_000), movimiento({ tipo: "gasto", monto: 999, fecha: "2026-09-30" }), movimiento({ tipo: "gasto", monto: 999, fecha: "2026-11-02" })],
    });
    assert.equal(r.total, 100_000);
  });

  describe("comparación con el periodo anterior", () => {
    const actuales = [gasto("mercado", 500_000), gasto("ocio", 200_000)];
    const anteriores = [
      movimiento({ tipo: "gasto", categoria: "mercado", monto: 400_000, fecha: "2026-09-10" }),
      movimiento({ tipo: "gasto", categoria: "ocio", monto: 250_000, fecha: "2026-09-12" }),
      movimiento({ tipo: "gasto", categoria: "moto", monto: 100_000, fecha: "2026-09-15" }),
    ];

    it("calcula el cambio total y por categoría", () => {
      const r = calcularInforme({ ...base, gastos: actuales, anteriores });
      assert.equal(r.anterior, 750_000);
      assert.equal(r.variacion, -7); // 700.000 frente a 750.000
      const mercado = r.categorias.find((c) => c.categoria === "mercado")!;
      assert.deepEqual([mercado.anterior, mercado.variacion], [400_000, 25]);
      const ocio = r.categorias.find((c) => c.categoria === "ocio")!;
      assert.deepEqual([ocio.anterior, ocio.variacion], [250_000, -20]);
    });

    it("dice qué subió más y qué bajó más, también si ya no se gastó en una categoría", () => {
      const r = calcularInforme({ ...base, gastos: actuales, anteriores });
      assert.deepEqual(r.masSubio, { categoria: "mercado", diferencia: 100_000 });
      assert.deepEqual(r.masBajo, { categoria: "moto", diferencia: -100_000 });
    });

    it("una categoría nueva no tiene porcentaje de cambio (antes era cero)", () => {
      const r = calcularInforme({ ...base, gastos: [...actuales, gasto("regalos", 50_000)], anteriores });
      const regalos = r.categorias.find((c) => c.categoria === "regalos")!;
      assert.deepEqual([regalos.anterior, regalos.variacion], [0, null]);
    });

    it("sin periodo anterior no hay comparación", () => {
      const r = calcularInforme({ ...base, gastos: actuales });
      assert.equal(r.anterior, null);
      assert.equal(r.variacion, null);
      assert.equal(r.masSubio, null);
      assert.equal(r.categorias[0].anterior, null);
    });
  });

  describe("varios meses", () => {
    it("reparte por mes, con los meses sin gastos en cero", () => {
      const r = calcularInforme({
        desde: "2026-08",
        hasta: "2026-10",
        hoy: "2026-10-20",
        gastos: [
          movimiento({ tipo: "gasto", monto: 100_000, fecha: "2026-08-03" }),
          movimiento({ tipo: "gasto", monto: 300_000, fecha: "2026-10-03" }),
        ],
      });
      assert.deepEqual(r.porMes.map((m) => [m.mes, m.total]), [["2026-08", 100_000], ["2026-09", 0], ["2026-10", 300_000]]);
      assert.equal(r.meses, 3);
      assert.equal(r.promedioMensual, 133_333);
    });

    it("en 'todo' arranca en el primer mes con gastos", () => {
      const r = calcularInforme({
        desde: null,
        hasta: "2026-10",
        hoy: "2026-10-20",
        gastos: [movimiento({ tipo: "gasto", monto: 50_000, fecha: "2026-08-03" }), gasto("mercado", 100_000)],
      });
      assert.equal(r.desde, "2026-08");
      assert.equal(r.meses, 3);
    });
  });

  describe("promedio por día", () => {
    it("el mes en curso se divide entre los días que van", () => {
      const r = calcularInforme({ ...base, hoy: "2026-10-10", gastos: [gasto("mercado", 100_000)] });
      assert.equal(r.promedioDiario, 10_000);
    });

    it("un mes cerrado se divide entre todos sus días", () => {
      const r = calcularInforme({ desde: "2026-09", hasta: "2026-09", hoy: "2026-10-10", gastos: [movimiento({ tipo: "gasto", monto: 300_000, fecha: "2026-09-10" })] });
      assert.equal(r.promedioDiario, 10_000); // septiembre tiene 30 días
    });

    it("un mes que no empieza todavía no tiene promedio", () => {
      const r = calcularInforme({ desde: "2026-12", hasta: "2026-12", hoy: "2026-10-10", gastos: [] });
      assert.equal(r.promedioDiario, null);
    });
  });
});

describe("periodos del informe", () => {
  it("el periodo termina en el mes elegido y abarca 1, 3, 6 o 12 meses", () => {
    assert.deepEqual(rangoDelInforme("mes", "2026-10"), { desde: "2026-10", hasta: "2026-10" });
    assert.deepEqual(rangoDelInforme("3m", "2026-10"), { desde: "2026-08", hasta: "2026-10" });
    assert.deepEqual(rangoDelInforme("12m", "2026-02"), { desde: "2025-03", hasta: "2026-02" });
    assert.deepEqual(rangoDelInforme("todo", "2026-10"), { desde: null, hasta: "2026-10" });
  });

  it("el periodo anterior tiene la misma duración y termina justo antes", () => {
    assert.deepEqual(rangoAnteriorDelInforme("mes", "2026-10"), { desde: "2026-09", hasta: "2026-09" });
    assert.deepEqual(rangoAnteriorDelInforme("3m", "2026-08"), { desde: "2026-05", hasta: "2026-07" });
    assert.deepEqual(rangoAnteriorDelInforme("6m", "2026-03"), { desde: "2025-09", hasta: "2026-02" });
    assert.equal(rangoAnteriorDelInforme("todo", null), null);
  });

  it("reconoce solo periodos válidos", () => {
    assert.ok(esPeriodoInforme("6m"));
    assert.ok(!esPeriodoInforme("año"));
    assert.ok(!esPeriodoInforme(undefined));
  });
});

describe("informe sin periodo anterior con gastos", () => {
  it("si antes no se gastó nada, no se compara", () => {
    const r = calcularInforme({ desde: "2026-10", hasta: "2026-10", hoy: "2026-10-20", gastos: [gasto("mercado", 100_000)], anteriores: [] });
    assert.equal(r.anterior, null);
    assert.equal(r.variacion, null);
    assert.equal(r.categorias[0].anterior, null);
    assert.equal(r.masSubio, null);
  });
});


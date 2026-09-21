import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agruparPorCategoria,
  calcularRecordatorios,
  componerResumen,
  generarConsejos,
  recordatoriosParaAvisar,
} from "../src/lib/finanzas";
import type { Movimiento, Recordatorio } from "../src/lib/types";

function movimiento(parcial: Partial<Movimiento>): Movimiento {
  return {
    id: Math.random().toString(36).slice(2),
    tipo: "gasto",
    categoria: "mercado",
    monto: 10_000,
    fecha: "2026-09-10",
    mes: "2026-09",
    nota: "",
    creadoEn: "2026-09-10T12:00:00.000Z",
    ...parcial,
  };
}

function recordatorio(parcial: Partial<Recordatorio>): Recordatorio {
  return {
    id: Math.random().toString(36).slice(2),
    titulo: "Arriendo",
    dia: 5,
    categoria: "arriendo",
    montoEstimado: 900_000,
    activo: true,
    pagados: [],
    creadoEn: "2026-01-01T00:00:00.000Z",
    ...parcial,
  };
}

describe("agruparPorCategoria", () => {
  it("suma por categoría, ordena de mayor a menor e ignora ahorro e ingresos", () => {
    const resultado = agruparPorCategoria([
      movimiento({ categoria: "mercado", monto: 100_000 }),
      movimiento({ categoria: "mercado", monto: 50_000 }),
      movimiento({ categoria: "gasolina", monto: 200_000 }),
      movimiento({ tipo: "ahorro", categoria: "ahorro", monto: 500_000 }),
      movimiento({ tipo: "ingreso", categoria: "ingreso-extra", monto: 300_000 }),
    ]);

    assert.deepEqual(
      resultado.map((c) => [c.categoria, c.total]),
      [
        ["gasolina", 200_000],
        ["mercado", 150_000],
      ],
    );
    assert.equal(resultado[0].porcentaje + resultado[1].porcentaje, 100);
  });

  it("devuelve lista vacía sin gastos", () => {
    assert.deepEqual(agruparPorCategoria([]), []);
  });
});

describe("calcularRecordatorios", () => {
  it("marca como pagado cuando hay un gasto de esa categoría en el mes", () => {
    const [resultado] = calcularRecordatorios(
      [recordatorio({ categoria: "arriendo" })],
      [movimiento({ categoria: "arriendo", monto: 900_000 })],
      "2026-09-21",
    );
    assert.equal(resultado.pagado, true);
  });

  it("marca como pagado cuando se marcó a mano ese mes", () => {
    const [resultado] = calcularRecordatorios(
      [recordatorio({ categoria: "", pagados: ["2026-09"] })],
      [],
      "2026-09-21",
    );
    assert.equal(resultado.pagado, true);
  });

  it("detecta vencidos y calcula los días que faltan", () => {
    const [resultado] = calcularRecordatorios(
      [recordatorio({ dia: 5, categoria: "" })],
      [],
      "2026-09-21",
    );
    assert.equal(resultado.vencido, true);
    assert.equal(resultado.vencimiento, "2026-10-05");
    assert.equal(resultado.diasFaltantes, 14);
  });

  it("no considera vencido un pago del mes pasado ya marcado", () => {
    const [resultado] = calcularRecordatorios(
      [recordatorio({ dia: 5, categoria: "", pagados: ["2026-09"] })],
      [],
      "2026-09-21",
    );
    assert.equal(resultado.vencido, false);
  });

  it("ordena pendientes primero y por cercanía", () => {
    const orden = calcularRecordatorios(
      [
        recordatorio({ titulo: "Pagado", categoria: "", pagados: ["2026-09"] }),
        recordatorio({ titulo: "Lejano", dia: 28, categoria: "" }),
        recordatorio({ titulo: "Cercano", dia: 22, categoria: "" }),
      ],
      [],
      "2026-09-21",
    ).map((r) => r.titulo);

    assert.deepEqual(orden, ["Cercano", "Lejano", "Pagado"]);
  });
});

describe("recordatoriosParaAvisar", () => {
  const calculados = calcularRecordatorios(
    [
      recordatorio({ titulo: "Mañana", dia: 22, categoria: "" }),
      recordatorio({ titulo: "En una semana", dia: 28, categoria: "" }),
      recordatorio({ titulo: "En pausa", dia: 22, categoria: "", activo: false }),
      recordatorio({ titulo: "Ya pagado", dia: 22, categoria: "", pagados: ["2026-09"] }),
    ],
    [],
    "2026-09-21",
  );

  it("solo avisa de los activos, sin pagar y dentro del margen", () => {
    assert.deepEqual(
      recordatoriosParaAvisar(calculados, 3).map((r) => r.titulo),
      ["Mañana"],
    );
  });

  it("amplía el aviso al subir el margen de días", () => {
    assert.deepEqual(
      recordatoriosParaAvisar(calculados, 10).map((r) => r.titulo),
      ["Mañana", "En una semana"],
    );
  });
});

describe("generarConsejos", () => {
  const base = {
    ingresoTotal: 2_000_000,
    gastado: 1_000_000,
    disponible: 500_000,
    ahorradoMes: 500_000,
    ahorroTotal: 5_000_000,
    metaAhorro: 20_000_000,
    metaNombre: "Moto nueva",
    categorias: agruparPorCategoria([movimiento({ categoria: "mercado", monto: 300_000 })]),
    promedioAhorroMensual: 500_000,
    mesesRestantes: 30,
    tendencia: [],
  };

  it("avisa primero cuando el mes está en rojo", () => {
    const consejos = generarConsejos({ ...base, disponible: -200_000 });
    assert.match(consejos[0], /por encima de tu ingreso/);
  });

  it("señala la categoría que se come el ingreso", () => {
    const consejos = generarConsejos({
      ...base,
      categorias: agruparPorCategoria([movimiento({ categoria: "arriendo", monto: 900_000 })]),
    });
    assert.ok(consejos.some((c) => c.includes("Arriendo")));
  });

  it("nunca devuelve más de cuatro consejos", () => {
    assert.ok(generarConsejos({ ...base, disponible: -1 }).length <= 4);
  });
});

describe("componerResumen", () => {
  const ajustes = {
    ingresoMensual: 2_000_000,
    metaAhorro: 20_000_000,
    metaNombre: "Moto nueva",
    metaFechaLimite: null,
    email: "yo@ejemplo.com",
    emailActivo: true,
    enviarSiempre: false,
    diasAviso: 3,
    actualizadoEn: "2026-09-01T00:00:00.000Z",
  };

  const base = {
    mes: "2026-09",
    hoy: "2026-09-21",
    ajustes,
    movimientos: [
      movimiento({ categoria: "arriendo", monto: 900_000 }),
      movimiento({ categoria: "mercado", monto: 300_000 }),
      movimiento({ tipo: "ahorro" as const, categoria: "ahorro", monto: 400_000 }),
      movimiento({ tipo: "ingreso" as const, categoria: "ingreso-extra", monto: 150_000 }),
    ],
    movimientosMesReal: [] as Movimiento[],
    recordatorios: [] as Recordatorio[],
    ahorroTotal: 4_000_000,
    mesesConAhorro: 8,
    tendencia: [],
  };

  it("suma el ingreso extra al ingreso base", () => {
    assert.equal(componerResumen(base).ingresoTotal, 2_150_000);
    assert.equal(componerResumen(base).ingresosExtra, 150_000);
  });

  it("descuenta gastos y ahorro de lo disponible", () => {
    const resumen = componerResumen(base);
    assert.equal(resumen.gastado, 1_200_000);
    assert.equal(resumen.ahorradoMes, 400_000);
    assert.equal(resumen.disponible, 2_150_000 - 1_200_000 - 400_000);
  });

  it("proyecta los meses que faltan con el ritmo promedio", () => {
    const resumen = componerResumen(base);
    assert.equal(resumen.promedioAhorroMensual, 500_000);
    assert.equal(resumen.progresoMeta, 20);
    // Faltan 16.000.000 a 500.000 por mes.
    assert.equal(resumen.mesesRestantes, 32);
  });

  it("no proyecta si todavía no hay aportes", () => {
    const resumen = componerResumen({ ...base, ahorroTotal: 0, mesesConAhorro: 0 });
    assert.equal(resumen.mesesRestantes, null);
    assert.equal(resumen.progresoMeta, 0);
  });

  it("tope el progreso en 100 y marca la meta cumplida", () => {
    const resumen = componerResumen({ ...base, ahorroTotal: 25_000_000 });
    assert.equal(resumen.progresoMeta, 100);
    assert.equal(resumen.mesesRestantes, 0);
  });

  it("sin meta definida no proyecta nada", () => {
    const resumen = componerResumen({
      ...base,
      ajustes: { ...ajustes, metaAhorro: 0 },
      ahorroTotal: 0,
      mesesConAhorro: 0,
    });
    assert.equal(resumen.progresoMeta, 0);
    assert.equal(resumen.mesesRestantes, null);
  });

  it("deja el disponible en negativo cuando se gasta de más", () => {
    const resumen = componerResumen({
      ...base,
      movimientos: [movimiento({ categoria: "arriendo", monto: 3_000_000 })],
    });
    assert.equal(resumen.disponible, -1_000_000);
    assert.match(resumen.consejos[0], /por encima de tu ingreso/);
  });

  it("traduce la fecha límite en una cuota mensual", () => {
    const resumen = componerResumen({
      ...base,
      ajustes: { ...ajustes, metaFechaLimite: "2027-09-21" },
    });
    // Faltan 16.000.000 y quedan ~12 meses.
    assert.equal(resumen.mesesHastaLimite, 12);
    assert.equal(resumen.cuotaSugerida, Math.ceil(16_000_000 / 12));
    assert.ok(resumen.consejos.some((c) => /mueves la fecha|llegas a tiempo/.test(c)));
  });

  it("avisa cuando el ritmo actual no alcanza para la fecha límite", () => {
    const resumen = componerResumen({
      ...base,
      ajustes: { ...ajustes, metaFechaLimite: "2027-09-21" },
    });
    assert.ok(resumen.consejos.some((c) => /harían falta/.test(c)));
  });

  it("no calcula cuota si la meta ya está cubierta", () => {
    const resumen = componerResumen({
      ...base,
      ahorroTotal: 20_000_000,
      ajustes: { ...ajustes, metaFechaLimite: "2027-09-21" },
    });
    assert.equal(resumen.cuotaSugerida, null);
    assert.equal(resumen.mesesHastaLimite, null);
  });

  it("con la fecha límite ya pasada no divide por cero", () => {
    const resumen = componerResumen({
      ...base,
      ajustes: { ...ajustes, metaFechaLimite: "2026-01-01" },
    });
    assert.equal(resumen.mesesHastaLimite, 0);
    assert.equal(resumen.cuotaSugerida, 16_000_000);
  });

  it("juzga los recordatorios contra el mes real, no contra el mes que se mira", () => {
    const resumen = componerResumen({
      ...base,
      mes: "2026-07",
      movimientos: [],
      movimientosMesReal: [movimiento({ categoria: "arriendo", monto: 900_000 })],
      recordatorios: [recordatorio({ categoria: "arriendo" })],
    });
    assert.equal(resumen.recordatorios[0].pagado, true);
  });
});

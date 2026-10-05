import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  agruparPorCategoria,
  calcularMetas,
  calcularPresupuestos,
  calcularRecordatorios,
  calcularSaldos,
  calcularSobranteAnterior,
  calendarioCuotas,
  calcularTendencia,
  componerResumen,
  esHoraDelAviso,
  GRACIA_AVISO_HORAS,
  HORA_AVISO_POR_DEFECTO,
  recordatoriosParaAvisar,
  repartirCuotas,
  sueldoPara,
  type SumaAgrupada,
} from "../src/lib/finanzas";
import { ajustes, cuenta, entrada, meta, movimiento, recordatorio } from "./fabricas";

function suma(parcial: Partial<SumaAgrupada>): SumaAgrupada {
  return {
    tipo: "ahorro",
    cuentaId: null,
    cuentaDestinoId: null,
    metaId: null,
    total: 0,
    primerMes: "2026-01",
    ...parcial,
  };
}

describe("lo libre para gastar descuenta los pagos fijos que faltan", () => {
  // El caso que motivó el cambio: el plan del celular vence el 28 y hoy es 21.
  const plan = recordatorio({ titulo: "Plan celular", dia: 28, categoria: "celular", montoEstimado: 54_900 });
  const base = entrada({
    movimientosMes: [
      movimiento({ categoria: "mercado", monto: 100_000 }),
      movimiento({ tipo: "ahorro", categoria: "ahorro", monto: 60_000 }),
    ],
    recordatorios: [plan],
  });

  it("resta el plan del celular antes de que llegue el día 28", () => {
    const r = componerResumen(base);
    assert.equal(r.fijosPendientes, 54_900);
    assert.equal(r.libre, 2_000_000 - 100_000 - 60_000 - 54_900);
  });

  it("deja de restarlo cuando se registra el pago vinculado, sin contarlo dos veces", () => {
    const pago = movimiento({ categoria: "celular", monto: 54_900, fecha: "2026-09-20", recurrenteId: plan.id });
    const r = componerResumen({ ...base, movimientosMes: [...base.movimientosMes, pago] });
    assert.equal(r.fijosPendientes, 0);
    assert.equal(r.gastado, 154_900);
    assert.equal(r.libre, 2_000_000 - 154_900 - 60_000);
  });

  it("usa el monto real del pago aunque difiera del estimado", () => {
    const pago = movimiento({ categoria: "celular", monto: 61_000, recurrenteId: plan.id });
    const r = componerResumen({ ...base, movimientosMes: [...base.movimientosMes, pago] });
    assert.equal(r.libre, 2_000_000 - 161_000 - 60_000);
  });

  it("sigue restando un pago vencido que no se ha pagado", () => {
    const arriendo = recordatorio({ dia: 5, montoEstimado: 900_000 });
    const r = componerResumen({ ...base, recordatorios: [arriendo] });
    assert.equal(r.fijosPendientes, 900_000);
  });

  it("no resta pagos en pausa", () => {
    const r = componerResumen({ ...base, recordatorios: [{ ...plan, activo: false }] });
    assert.equal(r.fijosPendientes, 0);
  });

  it("cuenta los días que quedan, contando hoy", () => {
    const r = componerResumen(base);
    // Septiembre tiene 30 días; del 21 al 30 inclusive son 10.
    assert.equal(r.diasRestantes, 10);
  });

  it("en un mes cerrado no hay días restantes ni pendientes", () => {
    const r = componerResumen({ ...base, mes: "2026-08", movimientosMes: [] });
    assert.equal(r.momento, "pasado");
    assert.equal(r.fijosPendientes, 0);
    assert.equal(r.diasRestantes, null);
  });

  it("en un mes futuro cuenta todos los fijos como pendientes", () => {
    const r = componerResumen({ ...base, mes: "2026-10", movimientosMes: [] });
    assert.equal(r.momento, "futuro");
    assert.equal(r.fijosPendientes, 54_900);
    assert.equal(r.diasRestantes, 31);
  });

  it("cuenta los pagos fijos sin monto para avisarlo", () => {
    const r = componerResumen({ ...base, recordatorios: [{ ...plan, montoEstimado: 0 }] });
    assert.equal(r.fijosSinMonto, 1);
    assert.ok(r.alertas.some((a) => /no tiene monto estimado/.test(a.texto)));
  });
});

describe("el sueldo", () => {
  it("se asume mientras no se registra", () => {
    const r = componerResumen(entrada());
    assert.equal(r.sueldoRegistrado, false);
    assert.equal(r.ingresoTotal, 2_000_000);
  });

  it("se reemplaza por el registrado, aunque sea distinto", () => {
    const r = componerResumen(
      entrada({ movimientosMes: [movimiento({ tipo: "ingreso", categoria: "sueldo", monto: 1_950_000 })] }),
    );
    assert.equal(r.sueldoRegistrado, true);
    assert.equal(r.ingresoTotal, 1_950_000);
  });

  it("suma los ingresos extra al esperado", () => {
    const r = componerResumen(
      entrada({ movimientosMes: [movimiento({ tipo: "ingreso", categoria: "ingreso-extra", monto: 150_000 })] }),
    );
    assert.equal(r.ingresoTotal, 2_150_000);
  });

  it("un aumento no reescribe los meses anteriores", () => {
    const sueldos = [
      { desde: "2020-01", monto: 2_000_000 },
      { desde: "2026-09", monto: 2_500_000 },
    ];
    assert.equal(sueldoPara(sueldos, "2026-08"), 2_000_000);
    assert.equal(sueldoPara(sueldos, "2026-09"), 2_500_000);
    assert.equal(sueldoPara(sueldos, "2027-03"), 2_500_000);
    assert.equal(sueldoPara(sueldos, "2019-12"), 0);
  });

  it("no depende del orden en que se guardaron los tramos", () => {
    assert.equal(
      sueldoPara([{ desde: "2026-09", monto: 3 }, { desde: "2020-01", monto: 1 }], "2026-10"),
      3,
    );
  });
});

describe("pagos fijos: pagado solo cuando consta", () => {
  it("un gasto de la misma categoría NO paga el recordatorio", () => {
    // Un cambio de aceite no es el seguro de la moto.
    const seguro = recordatorio({ titulo: "Seguro de la moto", dia: 23, categoria: "moto" });
    const [r] = calcularRecordatorios(
      [seguro],
      [movimiento({ categoria: "moto", monto: 145_000, nota: "Cambio de aceite" })],
      "2026-09-21",
    );
    assert.equal(r.pagado, false);
  });

  it("un gasto vinculado sí lo paga y guarda el monto real", () => {
    const seguro = recordatorio({ dia: 23, categoria: "moto" });
    const pago = movimiento({ categoria: "moto", monto: 187_000, recurrenteId: seguro.id });
    const [r] = calcularRecordatorios([seguro], [pago], "2026-09-21");
    assert.equal(r.pagado, true);
    assert.equal(r.pagoMovimientoId, pago.id);
    assert.equal(r.montoPagado, 187_000);
  });

  it("un pago vinculado de otro mes no cuenta", () => {
    const seguro = recordatorio({ dia: 23 });
    const pago = movimiento({ fecha: "2026-08-23", recurrenteId: seguro.id });
    const [r] = calcularRecordatorios([seguro], [pago], "2026-09-21");
    assert.equal(r.pagado, false);
  });

  it("marcado a mano cuenta como pagado", () => {
    const [r] = calcularRecordatorios([recordatorio({ pagados: ["2026-09"] })], [], "2026-09-21");
    assert.equal(r.pagado, true);
  });

  it("sin pagar y con el día pasado está vencido, con fecha de este mes", () => {
    const [r] = calcularRecordatorios([recordatorio({ dia: 5 })], [], "2026-09-21");
    assert.equal(r.vencido, true);
    assert.equal(r.vencimiento, "2026-09-05");
    assert.equal(r.diasFaltantes, -16);
  });

  it("una vez pagado, el próximo vencimiento pasa al mes siguiente", () => {
    const [r] = calcularRecordatorios([recordatorio({ dia: 5, pagados: ["2026-09"] })], [], "2026-09-21");
    assert.equal(r.vencido, false);
    assert.equal(r.vencimiento, "2026-10-05");
  });

  it("ajusta el día 31 al último día del mes", () => {
    const [r] = calcularRecordatorios([recordatorio({ dia: 31 })], [], "2026-02-10");
    assert.equal(r.vencimiento, "2026-02-28");
  });

  it("ordena: activos antes que pausados, pendientes antes que pagados, luego por cercanía", () => {
    const orden = calcularRecordatorios(
      [
        recordatorio({ titulo: "Pausado", dia: 22, activo: false }),
        recordatorio({ titulo: "Pagado", dia: 22, pagados: ["2026-09"] }),
        recordatorio({ titulo: "Lejano", dia: 29 }),
        recordatorio({ titulo: "Vencido", dia: 2 }),
      ],
      [],
      "2026-09-21",
    ).map((r) => r.titulo);
    assert.deepEqual(orden, ["Vencido", "Lejano", "Pagado", "Pausado"]);
  });

  it("avisa de lo vencido y de lo que vence dentro del margen", () => {
    const calculados = calcularRecordatorios(
      [
        recordatorio({ titulo: "Vencido", dia: 2 }),
        recordatorio({ titulo: "Mañana", dia: 22 }),
        recordatorio({ titulo: "Lejano", dia: 29 }),
        recordatorio({ titulo: "Pausado", dia: 22, activo: false }),
      ],
      [],
      "2026-09-21",
    );
    assert.deepEqual(
      recordatoriosParaAvisar(calculados, 3).map((r) => r.titulo),
      ["Vencido", "Mañana"],
    );
  });
});

describe("metas", () => {
  it("mide el ritmo sobre todos los meses desde el primer aporte", () => {
    // 3.000.000 aportados en 3 de los 8 meses de enero a agosto... medido a septiembre.
    const m = meta({ id: "m1" });
    const [r] = calcularMetas([m], [suma({ metaId: "m1", total: 3_000_000, primerMes: "2026-02" })], [], "2026-09-21");
    // De febrero a septiembre son 8 meses: 375.000 al mes, no 1.000.000.
    assert.equal(r.promedioMensual, 375_000);
    assert.equal(r.mesesRestantes, Math.ceil(17_000_000 / 375_000));
  });

  it("los retiros bajan lo ahorrado", () => {
    const m = meta({ id: "m1" });
    const [r] = calcularMetas(
      [m],
      [
        suma({ metaId: "m1", tipo: "ahorro", total: 4_000_000 }),
        suma({ metaId: "m1", tipo: "retiro", total: 1_000_000 }),
      ],
      [],
      "2026-09-21",
    );
    assert.equal(r.ahorrado, 3_000_000);
    assert.equal(r.progreso, 15);
  });

  it("los aportes antiguos sin meta van a la principal", () => {
    const principal = meta({ id: "p", principal: true });
    const otra = meta({ id: "o", principal: false, nombre: "Viaje" });
    const r = calcularMetas([principal, otra], [suma({ metaId: null, total: 500_000 })], [], "2026-09-21");
    assert.equal(r[0].ahorrado, 500_000);
    assert.equal(r[1].ahorrado, 0);
  });

  it("traduce la fecha límite en una cuota mensual que no se descuenta dos veces", () => {
    const m = meta({ id: "m1", fechaLimite: "2027-09-21" });
    const aporteHoy = movimiento({ tipo: "ahorro", categoria: "ahorro", monto: 1_000_000, metaId: "m1" });
    const [r] = calcularMetas(
      [m],
      [suma({ metaId: "m1", total: 5_000_000, primerMes: "2026-01" })],
      [aporteHoy],
      "2026-09-21",
    );
    // Al empezar el mes faltaban 16.000.000 (15.000.000 + el aporte de hoy), en 12 meses.
    assert.equal(r.mesesHastaLimite, 12);
    assert.equal(r.cuotaSugerida, Math.ceil(16_000_000 / 12));
  });

  it("con la fecha límite ya pasada no divide por cero", () => {
    const m = meta({ id: "m1", fechaLimite: "2026-01-01" });
    const [r] = calcularMetas([m], [], [], "2026-09-21");
    assert.equal(r.mesesHastaLimite, 0);
    assert.equal(r.cuotaSugerida, 20_000_000);
  });

  it("meta cumplida: 100% y sin cuota", () => {
    const m = meta({ id: "m1", fechaLimite: "2027-01-01" });
    const [r] = calcularMetas([m], [suma({ metaId: "m1", total: 25_000_000 })], [], "2026-09-21");
    assert.equal(r.progreso, 100);
    assert.equal(r.mesesRestantes, 0);
    assert.equal(r.cuotaSugerida, null);
  });

  it("un retiro devuelve plata a lo libre del mes", () => {
    const sin = componerResumen(entrada());
    const con = componerResumen(
      entrada({ movimientosMes: [movimiento({ tipo: "retiro", categoria: "retiro", monto: 200_000 })] }),
    );
    assert.equal(con.libre - sin.libre, 200_000);
  });

  it("calcula la cuota pendiente de las metas con fecha límite", () => {
    const m = meta({ id: "m1", fechaLimite: "2027-09-21" });
    const r = componerResumen(entrada({ metas: [m] }));
    assert.ok(r.cuotaMetasPendiente > 0);
  });
});

describe("saldos por cuenta", () => {
  it("aplica cada tipo de movimiento a la cuenta correcta", () => {
    const principal = cuenta({ id: "c1", saldoInicial: 100_000 });
    const ahorro = cuenta({ id: "c2", tipo: "ahorro", nombre: "Ahorro" });
    const efectivo = cuenta({ id: "c3", tipo: "efectivo", nombre: "Efectivo" });
    const saldos = calcularSaldos(
      [principal, ahorro, efectivo],
      [
        suma({ tipo: "ingreso", cuentaId: "c1", total: 2_000_000 }),
        suma({ tipo: "gasto", cuentaId: "c1", total: 500_000 }),
        suma({ tipo: "transferencia", cuentaId: "c1", cuentaDestinoId: "c3", total: 200_000 }),
        suma({ tipo: "ahorro", cuentaId: "c1", cuentaDestinoId: "c2", total: 300_000 }),
        suma({ tipo: "retiro", cuentaId: "c1", cuentaDestinoId: "c2", total: 50_000 }),
        suma({ tipo: "gasto", cuentaId: "c3", total: 30_000 }),
      ],
    );
    const por = Object.fromEntries(saldos.map((s) => [s.id, s.saldo]));
    assert.equal(por.c1, 100_000 + 2_000_000 - 500_000 - 200_000 - 300_000 + 50_000);
    assert.equal(por.c2, 300_000 - 50_000);
    assert.equal(por.c3, 200_000 - 30_000);
  });

  it("los movimientos antiguos sin cuenta van a la principal", () => {
    const [s] = calcularSaldos([cuenta({ id: "c1" })], [suma({ tipo: "gasto", cuentaId: null, total: 10 })]);
    assert.equal(s.saldo, -10);
  });

  it("un aporte a una meta sin cuenta solo sale de la cuenta de origen", () => {
    const [s] = calcularSaldos([cuenta({ id: "c1" })], [suma({ tipo: "ahorro", cuentaId: "c1", total: 70 })]);
    assert.equal(s.saldo, -70);
  });
});

describe("presupuestos", () => {
  const movs = [
    movimiento({ categoria: "almuerzo", monto: 90_000 }),
    movimiento({ categoria: "ocio", monto: 130_000 }),
    movimiento({ categoria: "mercado", monto: 100_000 }),
  ];

  it("clasifica en ok, cerca y excedido, del más apretado al más holgado", () => {
    const r = calcularPresupuestos(
      [
        { categoria: "mercado", tope: 400_000 },
        { categoria: "almuerzo", tope: 100_000 },
        { categoria: "ocio", tope: 100_000 },
      ],
      movs,
    );
    assert.deepEqual(
      r.map((p) => [p.categoria, p.estado]),
      [
        ["ocio", "excedido"],
        ["almuerzo", "cerca"],
        ["mercado", "ok"],
      ],
    );
  });

  it("ignora topes en cero", () => {
    assert.deepEqual(calcularPresupuestos([{ categoria: "ocio", tope: 0 }], movs), []);
  });
});

describe("alertas", () => {
  it("no inventa nada cuando todo está en orden", () => {
    const r = componerResumen(
      entrada({ movimientosMes: [movimiento({ tipo: "ingreso", categoria: "sueldo", monto: 2_000_000 })] }),
    );
    assert.deepEqual(r.alertas, []);
  });

  it("explica el rojo mencionando los pagos fijos pendientes", () => {
    const r = componerResumen(
      entrada({
        movimientosMes: [movimiento({ monto: 1_950_000 })],
        recordatorios: [recordatorio({ dia: 28, montoEstimado: 54_900 })],
      }),
    );
    assert.equal(r.alertas[0].tono, "riesgo");
    assert.match(r.alertas[0].texto, /pagos fijos que faltan/);
  });

  it("avisa de pagos vencidos", () => {
    const r = componerResumen(entrada({ recordatorios: [recordatorio({ titulo: "Arriendo", dia: 5 })] }));
    assert.ok(r.alertas.some((a) => a.tono === "riesgo" && /Arriendo venció/.test(a.texto)));
  });

  it("avisa de topes excedidos y cercanos", () => {
    const r = componerResumen(
      entrada({
        movimientosMes: [
          movimiento({ categoria: "ocio", monto: 130_000 }),
          movimiento({ categoria: "almuerzo", monto: 90_000 }),
        ],
        presupuestos: [
          { categoria: "ocio", tope: 100_000 },
          { categoria: "almuerzo", tope: 100_000 },
        ],
      }),
    );
    assert.ok(r.alertas.some((a) => /Te pasaste del tope en Ocio/.test(a.texto)));
    assert.ok(r.alertas.some((a) => /Comida fuera va en 90%/.test(a.texto)));
  });

  it("avisa si el ritmo no alcanza para la fecha límite de una meta", () => {
    const m = meta({ id: "m1", fechaLimite: "2027-03-01" });
    const r = componerResumen(
      entrada({ metas: [m], sumas: [suma({ metaId: "m1", total: 1_000_000, primerMes: "2026-01" })] }),
    );
    assert.ok(r.alertas.some((a) => /harían falta/.test(a.texto)));
  });
});

describe("tendencia", () => {
  it("incluye el sueldo esperado en los meses donde no se registró", () => {
    const puntos = calcularTendencia(
      [
        { mes: "2026-08", tipo: "ingreso", categoria: "sueldo", total: 1_900_000 },
        { mes: "2026-08", tipo: "gasto", categoria: "mercado", total: 500_000 },
        { mes: "2026-09", tipo: "ahorro", categoria: "ahorro", total: 300_000 },
        { mes: "2026-09", tipo: "retiro", categoria: "retiro", total: 100_000 },
      ],
      "2026-09",
      ajustes().sueldos,
    );
    assert.equal(puntos.length, 6);
    assert.deepEqual(puntos.map((p) => p.etiqueta), ["abr", "may", "jun", "jul", "ago", "sep"]);
    assert.equal(puntos[4].ingreso, 1_900_000);
    assert.equal(puntos[4].gastado, 500_000);
    assert.equal(puntos[5].ingreso, 2_000_000);
    assert.equal(puntos[5].ahorrado, 200_000);
  });
});

describe("agruparPorCategoria", () => {
  it("suma solo gastos y ordena de mayor a menor", () => {
    const r = agruparPorCategoria([
      movimiento({ categoria: "mercado", monto: 150_000 }),
      movimiento({ categoria: "gasolina", monto: 200_000 }),
      movimiento({ tipo: "ahorro", categoria: "ahorro", monto: 999_999 }),
    ]);
    assert.deepEqual(r.map((c) => c.categoria), ["gasolina", "mercado"]);
  });
});

describe("gastos programados una sola vez (cumpleaños, aniversarios)", () => {
  // Hoy es 21 de septiembre de 2026 (ver `entrada`).
  const cumple = recordatorio({ titulo: "Cumpleaños de mamá", fecha: "2026-11-15", dia: 15, montoEstimado: 200_000 });

  it("cuenta los días que faltan aunque sea de otro mes", () => {
    const [r] = calcularRecordatorios([cumple], [], "2026-09-21");
    assert.equal(r.vencimiento, "2026-11-15");
    assert.equal(r.diasFaltantes, 55);
    assert.equal(r.esteMes, false);
    assert.equal(r.vencido, false);
  });

  it("no descuenta de lo libre de este mes un gasto de un mes que viene", () => {
    const r = componerResumen(entrada({ recordatorios: [cumple] }));
    assert.equal(r.fijosPendientes, 0);
  });

  it("sí lo descuenta en su propio mes", () => {
    const r = componerResumen(entrada({ recordatorios: [{ ...cumple, fecha: "2026-09-28", dia: 28 }] }));
    assert.equal(r.fijosPendientes, 200_000);
  });

  it("al proyectar su mes, lo cuenta; en otro mes futuro, no", () => {
    const noviembre = componerResumen(entrada({ mes: "2026-11", recordatorios: [cumple] }));
    const octubre = componerResumen(entrada({ mes: "2026-10", recordatorios: [cumple] }));
    assert.equal(noviembre.fijosPendientes, 200_000);
    assert.equal(octubre.fijosPendientes, 0);
  });

  it("queda pagado con la marca de su mes aunque se pague antes", () => {
    const [r] = calcularRecordatorios([{ ...cumple, pagados: ["2026-11"] }], [], "2026-09-21");
    assert.equal(r.pagado, true);
  });

  it("vence si pasa su día sin pagarse, y desaparece cuando termina su mes", () => {
    const pasado = { ...cumple, fecha: "2026-09-10", dia: 10 };
    const [vencido] = calcularRecordatorios([pasado], [], "2026-09-21");
    assert.equal(vencido.vencido, true);
    assert.equal(calcularRecordatorios([pasado], [], "2026-10-01").length, 0);
  });

  it("avisa por correo cuando entra en el margen de días", () => {
    const pronto = { ...cumple, fecha: "2026-09-23", dia: 23 };
    assert.equal(recordatoriosParaAvisar(calcularRecordatorios([pronto], [], "2026-09-21"), 3).length, 1);
    assert.equal(recordatoriosParaAvisar(calcularRecordatorios([cumple], [], "2026-09-21"), 3).length, 0);
  });
});

describe("pagos fijos que empiezan en un mes", () => {
  const hoy = "2026-09-30";
  const arriendo = recordatorio({ titulo: "Arriendo", dia: 7, montoEstimado: 500_000, desde: "2026-10" });

  it("antes de su mes de inicio no está vencido y su primer vencimiento es en ese mes", () => {
    const [r] = calcularRecordatorios([arriendo], [], hoy);
    assert.equal(r.vencido, false);
    assert.equal(r.esteMes, false);
    assert.equal(r.pagado, false);
    assert.equal(r.vencimiento, "2026-10-07");
    assert.equal(r.diasFaltantes, 7);
  });

  it("no descuenta de lo libre ni genera alerta de vencido", () => {
    const resumen = componerResumen(entrada({ hoy, recordatorios: [arriendo] }));
    assert.equal(resumen.fijosPendientes, 0);
    assert.ok(!resumen.alertas.some((a) => a.clave === "vencidos"));
  });

  it("sin mes de inicio, el mismo arriendo sí cuenta como vencido y descuenta", () => {
    const sinInicio = recordatorio({ titulo: "Arriendo", dia: 7, montoEstimado: 500_000 });
    const resumen = componerResumen(entrada({ hoy, recordatorios: [sinInicio] }));
    assert.equal(resumen.recordatorios[0].vencido, true);
    assert.equal(resumen.fijosPendientes, 500_000);
  });

  it("cuando llega su mes, se comporta como cualquier pago fijo", () => {
    const [r] = calcularRecordatorios([arriendo], [], "2026-10-09");
    assert.equal(r.esteMes, true);
    assert.equal(r.vencido, true);
    assert.equal(r.vencimiento, "2026-10-07");
  });

  it("avisa por correo cuando se acerca, dentro del margen", () => {
    const calculados = calcularRecordatorios([arriendo], [], "2026-10-06");
    assert.equal(recordatoriosParaAvisar(calculados, 1).length, 1);
    assert.equal(recordatoriosParaAvisar(calcularRecordatorios([arriendo], [], hoy), 1).length, 0);
  });
});

describe("compras en cuotas", () => {
  it("las cuotas suman exactamente el total", () => {
    for (const [total, n] of [[100_000, 3], [1_000_000, 12], [7, 3], [48_000, 60], [99_999, 7]] as const) {
      const cuotas = repartirCuotas(total, n);
      assert.equal(cuotas.length, n);
      assert.equal(cuotas.reduce((a, b) => a + b, 0), total);
    }
  });

  it("lo que sobra de la división va a la primera cuota", () => {
    assert.deepEqual(repartirCuotas(100_000, 3), [33_334, 33_333, 33_333]);
    assert.deepEqual(repartirCuotas(90_000, 3), [30_000, 30_000, 30_000]);
    assert.deepEqual(repartirCuotas(50_000, 1), [50_000]);
  });

  it("el saldo de una tarjeta refleja de una vez toda la deuda", () => {
    const tarjeta = cuenta({ id: "tc", tipo: "tarjeta", cupo: 2_000_000 });
    const [conSaldo] = calcularSaldos([tarjeta], [suma({ tipo: "gasto", cuentaId: "tc", total: 600_000 })]);
    assert.equal(conSaldo.saldo, -600_000);
  });

  it("cada mes solo cuenta su cuota como gastado", () => {
    const septiembre = movimiento({ monto: 100_000, fecha: "2026-09-30", cuota: 1, cuotas: 3, compraId: "c1" });
    const octubre = movimiento({ monto: 100_000, fecha: "2026-10-30", cuota: 2, cuotas: 3, compraId: "c1" });
    const resumen = componerResumen(entrada({ mes: "2026-10", hoy: "2026-10-05", movimientosMes: [octubre] }));
    assert.equal(resumen.gastado, 100_000);
    assert.ok(septiembre.mes !== octubre.mes);
  });
});

describe("sobrante de meses anteriores y total disponible", () => {
  const fila = (mes: string, tipo: "ingreso" | "gasto" | "ahorro" | "retiro", total: number, categoria = tipo === "ingreso" ? "sueldo" : "mercado") => ({
    mes,
    tipo,
    categoria,
    total,
  });

  it("sin historial no hay sobrante", () => {
    assert.deepEqual(calcularSobranteAnterior([], "2026-10", []), { total: 0, meses: 0 });
  });

  it("en el primer mes de uso no hay meses anteriores", () => {
    const filas = [fila("2026-10", "ingreso", 1_860_000)];
    assert.deepEqual(calcularSobranteAnterior(filas, "2026-10", []), { total: 0, meses: 0 });
  });

  it("suma lo que sobró en cada mes anterior: ingreso menos gastado y apartado", () => {
    const filas = [
      fila("2026-08", "ingreso", 2_000_000),
      fila("2026-08", "gasto", 1_500_000),
      fila("2026-09", "ingreso", 2_000_000),
      fila("2026-09", "gasto", 1_200_000),
      fila("2026-09", "ahorro", 300_000),
    ];
    // agosto 500.000 + septiembre 500.000
    assert.deepEqual(calcularSobranteAnterior(filas, "2026-10", []), { total: 1_000_000, meses: 2 });
  });

  it("un mes que se gastó de más resta, y un retiro de meta suma", () => {
    const filas = [
      fila("2026-08", "ingreso", 1_000_000),
      fila("2026-08", "gasto", 1_400_000),
      fila("2026-09", "ingreso", 1_000_000),
      fila("2026-09", "retiro", 200_000),
    ];
    // agosto −400.000 + septiembre (1.000.000 + 200.000 devueltos de una meta)
    assert.equal(calcularSobranteAnterior(filas, "2026-10", []).total, 800_000);
  });

  it("usa el sueldo esperado de un mes en que no se registró, y solo desde el primer mes con datos", () => {
    const sueldos = [{ desde: "2000-01", monto: 1_000_000 }];
    const filas = [fila("2026-08", "gasto", 300_000), fila("2026-09", "gasto", 400_000)];
    // no cuenta enero..julio (sin datos): agosto 700.000 + septiembre 600.000
    assert.deepEqual(calcularSobranteAnterior(filas, "2026-10", sueldos), { total: 1_300_000, meses: 2 });
  });

  it("no cuenta el mes que se está viendo ni los posteriores", () => {
    const filas = [fila("2026-09", "ingreso", 500_000), fila("2026-10", "ingreso", 9_000_000), fila("2026-11", "ingreso", 9_000_000)];
    assert.equal(calcularSobranteAnterior(filas, "2026-10", []).total, 500_000);
  });

  it("el resumen suma lo libre de este mes con el sobrante anterior", () => {
    const serie = [
      fila("2026-09", "ingreso", 2_000_000),
      fila("2026-09", "gasto", 1_500_000),
      fila("2026-10", "ingreso", 1_860_000),
    ];
    const r = componerResumen(
      entrada({
        mes: "2026-10",
        hoy: "2026-10-05",
        movimientosMes: [movimiento({ tipo: "ingreso", categoria: "sueldo", monto: 1_860_000, fecha: "2026-10-01" })],
        serie,
        recordatorios: [recordatorio({ dia: 7, montoEstimado: 500_000 })],
      }),
    );
    assert.equal(r.libre, 1_360_000);
    assert.equal(r.sobranteAnterior, 500_000);
    assert.equal(r.mesesAnteriores, 1);
    assert.equal(r.totalDisponible, 1_860_000);
  });
});

describe("calendario de las cuotas", () => {
  it("sin día de pago, cada cuota cae el día de la compra", () => {
    assert.deepEqual(calendarioCuotas("2026-10-08", 3, null), ["2026-10-08", "2026-11-08", "2026-12-08"]);
  });

  it("con día de pago, cada cuota cae ese día", () => {
    assert.deepEqual(calendarioCuotas("2026-10-08", 3, 15), ["2026-10-15", "2026-11-15", "2026-12-15"]);
  });

  it("la primera cuota puede cobrarse el mes siguiente y cruza de año", () => {
    assert.deepEqual(calendarioCuotas("2026-11-20", 3, 5, 1), ["2026-12-05", "2027-01-05", "2027-02-05"]);
  });

  it("un día 31 cae el último día de los meses cortos y vuelve al 31", () => {
    assert.deepEqual(calendarioCuotas("2026-01-10", 3, 31), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("el resumen separa las cuotas del mes de lo demás gastado", () => {
    const r = componerResumen(
      entrada({
        movimientosMes: [
          movimiento({ monto: 100_000, cuota: 2, cuotas: 6, compraId: "c1" }),
          movimiento({ monto: 40_000 }),
        ],
        cuotasProximas: [{ mes: "2026-10", total: 100_000, cantidad: 1 }],
      }),
    );
    assert.equal(r.gastado, 140_000);
    assert.equal(r.cuotasDelMes, 100_000);
    assert.equal(r.cuotasProximas.length, 1);
  });
});

describe("hora del aviso diario", () => {
  it("toca a la hora elegida y en las horas de gracia que siguen", () => {
    assert.equal(esHoraDelAviso(8, 8), true);
    assert.equal(esHoraDelAviso(9, 8), true);
    assert.equal(esHoraDelAviso(8 + GRACIA_AVISO_HORAS - 1, 8), true);
  });

  it("no toca antes de la hora ni cuando la gracia ya se agotó", () => {
    assert.equal(esHoraDelAviso(7, 8), false);
    assert.equal(esHoraDelAviso(8 + GRACIA_AVISO_HORAS, 8), false);
    assert.equal(esHoraDelAviso(22, 8), false);
  });

  it("a las 11 p. m. solo toca esa hora: la gracia no cruza la medianoche", () => {
    assert.equal(esHoraDelAviso(23, 23), true);
    assert.equal(esHoraDelAviso(0, 23), false);
    assert.equal(esHoraDelAviso(1, 23), false);
  });

  it("a medianoche toca en las primeras horas del día", () => {
    assert.equal(esHoraDelAviso(0, 0), true);
    assert.equal(esHoraDelAviso(2, 0), true);
    assert.equal(esHoraDelAviso(3, 0), false);
  });

  it("el cron diario de Vercel (7:00 a. m. en Colombia) alcanza a quien eligió entre las 5 y las 7", () => {
    for (const hora of [5, 6, 7]) assert.equal(esHoraDelAviso(7, hora), true);
    assert.equal(esHoraDelAviso(7, 4), false);
    assert.equal(esHoraDelAviso(7, 8), false);
  });

  it("por defecto es a las 7", () => {
    assert.equal(HORA_AVISO_POR_DEFECTO, 7);
  });
});

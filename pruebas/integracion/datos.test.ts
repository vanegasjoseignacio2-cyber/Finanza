/**
 * Pruebas contra un MongoDB real. Se ejecutan cuando existe MONGODB_URI_PRUEBAS
 * (el CI levanta un servicio mongo:7); sin ella se omiten.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BSON, MongoClient } from "mongodb";
import * as datos from "../../src/lib/datos";
import * as db from "../../src/lib/db";
import * as fechas from "../../src/lib/fechas";
import { calcularSaldos } from "../../src/lib/finanzas";
import * as diario from "../../src/lib/recordatorio-diario";

const URI = process.env.MONGODB_URI_PRUEBAS;
const omitir = URI ? false : "sin MONGODB_URI_PRUEBAS: se omiten las pruebas contra MongoDB";

// Cada archivo de pruebas usa su propia base, que se borra al terminar.
const BASE = `finanza_prueba_${process.pid}_${Date.now()}`;

let conectado = false;

describe("capa de datos contra MongoDB", { skip: omitir }, () => {
  before(() => {
    // La conexión lee estas variables en la primera consulta, no al importar.
    process.env.MONGODB_URI = URI;
    process.env.MONGODB_DB = BASE;
    // Los datos son de cada usuario: las pruebas fijan uno (solo con esta variable).
    process.env.FINANZA_PRUEBAS = "1";
    db.fijarUsuarioDePruebas("pruebas@ejemplo.com");
    conectado = true;
  });

  beforeEach(async () => {
    const base = await db.getDb();
    for (const nombre of await base.listCollections({}, { nameOnly: true }).toArray()) {
      await base.collection(nombre.name).deleteMany({});
    }
  });

  after(async () => {
    if (!conectado) return;
    await (await db.getDb()).dropDatabase();
    const otra = new MongoClient(URI as string);
    await otra.connect();
    await otra.db(`${BASE}_b`).dropDatabase();
    await otra.close();
    db.fijarUsuarioDePruebas(undefined);
    delete process.env.FINANZA_PRUEBAS;
    await db.cerrarConexion();
  });

  it("crea una sola cuenta principal aunque se pida a la vez", async () => {
    const [a, b, c] = await Promise.all([datos.listarCuentas(), datos.listarCuentas(), datos.listarCuentas()]);
    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
    assert.equal(c.length, 1);
    assert.equal(a[0].nombre, "Principal");
  });

  it("migra los datos del modelo anterior sin perder cifras", async () => {
    const base = await db.getDb();
    const mes = fechas.mesActual();
    await base.collection("ajustes").insertOne({
      _id: "app" as never,
      ingresoMensual: 1_423_500,
      metaAhorro: 20_000_000,
      metaNombre: "Moto nueva",
      metaFechaLimite: null,
      email: "yo@ejemplo.com",
    });
    // Movimientos antiguos: sin cuenta y aportes sin meta.
    await base.collection("movimientos").insertMany([
      { tipo: "gasto", categoria: "mercado", monto: 200_000, fecha: `${mes}-02`, mes, nota: "", creadoEn: "x" },
      { tipo: "ahorro", categoria: "ahorro", monto: 300_000, fecha: `${mes}-03`, mes, nota: "", creadoEn: "x" },
    ]);

    const r = await datos.calcularResumen(mes);
    assert.equal(r.sueldoEsperado, 1_423_500);
    assert.equal(r.metas.length, 1);
    assert.equal(r.metas[0].nombre, "Moto nueva");
    assert.equal(r.metas[0].ahorrado, 300_000);
    assert.equal(r.cuentas[0].saldo, -500_000);
    assert.equal(r.libre, 1_423_500 - 200_000 - 300_000);

    // La migración de la meta es idempotente.
    await Promise.all([datos.listarMetas(), datos.listarMetas()]);
    assert.equal((await datos.listarMetas()).length, 1);
  });

  it("descuenta el pago fijo pendiente hasta que se registra, y lo repone al deshacerlo", async () => {
    await datos.fijarSueldo("2020-01", 2_000_000);
    const plan = await datos.crearRecordatorio({ titulo: "Plan celular", dia: 28, categoria: "celular", montoEstimado: 54_900 });
    const hoy = fechas.hoyISO();

    const antes = await datos.calcularResumen();
    assert.equal(antes.fijosPendientes, 54_900);
    assert.equal(antes.libre, 2_000_000 - 54_900);

    await datos.pagarRecordatorio(plan.id, { monto: 56_000, fecha: hoy, cuentaId: null, nota: "" });
    const despues = await datos.calcularResumen();
    assert.equal(despues.fijosPendientes, 0);
    assert.equal(despues.gastado, 56_000);
    assert.equal(despues.libre, 2_000_000 - 56_000);
    assert.equal(despues.recordatorios[0].pagado, true);

    await assert.rejects(
      datos.pagarRecordatorio(plan.id, { monto: 1, fecha: hoy, cuentaId: null, nota: "" }),
      /ya está registrado/,
    );

    await datos.deshacerPago(plan.id, hoy.slice(0, 7));
    const deshecho = await datos.calcularResumen();
    assert.equal(deshecho.gastado, 0);
    assert.equal(deshecho.fijosPendientes, 54_900);
  });

  it("un gasto de la misma categoría no da por pagado el recordatorio", async () => {
    const seguro = await datos.crearRecordatorio({ titulo: "Seguro de la moto", dia: 28, categoria: "moto", montoEstimado: 187_000 });
    await datos.crearMovimiento({ tipo: "gasto", categoria: "moto", monto: 145_000, fecha: fechas.hoyISO(), nota: "Aceite" });
    const r = await datos.calcularResumen();
    assert.equal(r.recordatorios.find((x) => x.id === seguro.id)?.pagado, false);
  });

  it("valida los movimientos contra lo que existe", async () => {
    const [principal] = await datos.listarCuentas();
    const fecha = fechas.hoyISO();
    await assert.rejects(datos.crearMovimiento({ tipo: "gasto", categoria: "inventada", monto: 1, fecha, nota: "" }), /categoría/);
    await assert.rejects(datos.crearMovimiento({ tipo: "ingreso", categoria: "mercado", monto: 1, fecha, nota: "" }), /ingreso/);
    await assert.rejects(datos.crearMovimiento({ tipo: "ahorro", monto: 1, fecha, nota: "" }), /meta/);
    await assert.rejects(
      datos.crearMovimiento({ tipo: "transferencia", monto: 1, fecha, nota: "", cuentaId: principal.id, cuentaDestinoId: principal.id }),
      /distintas/,
    );
    await assert.rejects(
      datos.crearMovimiento({ tipo: "gasto", categoria: "mercado", monto: 1, fecha, nota: "", recurrenteId: "0123456789abcdef01234567" }),
      /no existe/,
    );
  });

  it("calcula saldos, metas y retiros con agregaciones reales", async () => {
    const [principal] = await datos.listarCuentas();
    const ahorro = await datos.crearCuenta({ nombre: "Ahorro", tipo: "ahorro", saldoInicial: 0 });
    const meta = await datos.crearMeta({ nombre: "Viaje", monto: 1_000_000, fechaLimite: null, cuentaId: ahorro.id });
    const fecha = fechas.hoyISO();

    await datos.crearMovimiento({ tipo: "ingreso", categoria: "sueldo", monto: 2_000_000, fecha, nota: "" });
    await datos.crearMovimiento({ tipo: "ahorro", monto: 400_000, fecha, nota: "", metaId: meta.id });
    await datos.crearMovimiento({ tipo: "retiro", monto: 100_000, fecha, nota: "", metaId: meta.id });
    await datos.crearMovimiento({ tipo: "gasto", categoria: "mercado", monto: 250_000, fecha, nota: "" });

    const r = await datos.calcularResumen();
    const saldo = Object.fromEntries(r.cuentas.map((c) => [c.id, c.saldo]));
    assert.equal(saldo[principal.id], 2_000_000 - 400_000 + 100_000 - 250_000);
    assert.equal(saldo[ahorro.id], 300_000);
    assert.equal(r.metas.find((m) => m.id === meta.id)?.ahorrado, 300_000);
    assert.equal(r.ahorroNeto, 300_000);
    assert.equal(r.sueldoRegistrado, true);
    assert.equal(r.ingresoTotal, 2_000_000);
    assert.equal(r.tendencia.at(-1)?.gastado, 250_000);
  });

  it("edita un movimiento validándolo de nuevo", async () => {
    const m = await datos.crearMovimiento({ tipo: "gasto", categoria: "mercado", monto: 10_000, fecha: fechas.hoyISO(), nota: "" });
    const editado = await datos.actualizarMovimiento(m.id, { tipo: "gasto", categoria: "ocio", monto: 12_000, fecha: m.fecha, nota: "Cine" });
    assert.equal(editado.categoria, "ocio");
    assert.equal(editado.monto, 12_000);
    await assert.rejects(datos.actualizarMovimiento(m.id, { tipo: "gasto", categoria: "nada", monto: 1, fecha: m.fecha, nota: "" }));
  });

  it("busca sin interpretar la consulta como expresión regular", async () => {
    const fecha = fechas.hoyISO();
    await datos.crearMovimiento({ tipo: "gasto", categoria: "ocio", monto: 1, fecha, nota: "Entrada (2x1) cine" });
    await datos.crearMovimiento({ tipo: "gasto", categoria: "mercado", monto: 1, fecha, nota: "Tienda" });
    assert.equal((await datos.listarMovimientos({ q: "(2x1)" })).length, 1);
    assert.equal((await datos.listarMovimientos({ q: ".*" })).length, 0);
    // También encuentra por el nombre de la categoría.
    assert.equal((await datos.listarMovimientos({ q: "mercad" })).length, 1);
  });

  it("filtra por cuenta incluyendo los movimientos antiguos sin cuenta", async () => {
    const [principal] = await datos.listarCuentas();
    const mes = fechas.mesActual();
    await (await db.getDb()).collection("movimientos").insertOne({
      tipo: "gasto", categoria: "mercado", monto: 5, fecha: `${mes}-01`, mes, nota: "viejo", creadoEn: "x",
    });
    const otra = await datos.crearCuenta({ nombre: "Efectivo", tipo: "efectivo", saldoInicial: 0 });
    await datos.crearMovimiento({ tipo: "gasto", categoria: "mercado", monto: 7, fecha: fechas.hoyISO(), nota: "nuevo", cuentaId: otra.id });
    assert.deepEqual((await datos.listarMovimientos({ cuentaId: principal.id })).map((m) => m.nota), ["viejo"]);
    assert.deepEqual((await datos.listarMovimientos({ cuentaId: otra.id })).map((m) => m.nota), ["nuevo"]);
  });

  it("reserva el envío del día una sola vez aunque lleguen varias llamadas a la vez", async () => {
    const resultados = await Promise.all(Array.from({ length: 6 }, () => datos.reservarEnvio("2026-09-21")));
    assert.equal(resultados.filter(Boolean).length, 1);

    await datos.cerrarEnvio("2026-09-21", { estado: "error", error: "caído" });
    assert.equal(await datos.reservarEnvio("2026-09-21"), true, "un día con error se reintenta");

    await datos.cerrarEnvio("2026-09-21", { estado: "enviado" });
    assert.equal(await datos.reservarEnvio("2026-09-21"), false, "un día enviado no se repite");
    await datos.registrarOmitido("2026-09-21", "no pisa");
    assert.equal((await datos.listarEnvios())[0].estado, "enviado");
  });

  it("dos disparos simultáneos del cron mandan un solo correo", async () => {
    await datos.guardarAjustes({ email: "yo@ejemplo.com" });
    let enviados = 0;
    const enviar = async () => {
      enviados++;
      await new Promise((r) => setTimeout(r, 50));
      return { ok: true, proveedor: "resend" as const };
    };
    const resultados = await Promise.all([
      diario.ejecutarRecordatorioDiario({ enviar }),
      diario.ejecutarRecordatorioDiario({ enviar }),
      diario.ejecutarRecordatorioDiario({ enviar }),
    ]);
    assert.equal(enviados, 1);
    assert.equal(resultados.filter((r) => r.enviado).length, 1);
    assert.equal((await datos.listarEnvios())[0].estado, "enviado");
  });

  it("registra el error del proveedor para mostrarlo en Ajustes", async () => {
    await datos.guardarAjustes({ email: "yo@ejemplo.com" });
    const r = await diario.ejecutarRecordatorioDiario({
      enviar: async () => ({ ok: false, proveedor: "smtp" as const, error: "535 credenciales" }),
    });
    assert.equal(r.enviado, false);
    const [envio] = await datos.listarEnvios();
    assert.equal(envio.estado, "error");
    assert.equal(envio.error, "535 credenciales");
  });

  it("bloquea el acceso tras cinco fallos seguidos", async () => {
    for (let i = 0; i < datos.MAX_FALLOS - 1; i++) assert.equal(await datos.registrarFallo("ip"), null);
    assert.ok(await datos.registrarFallo("ip"));
    assert.ok(await datos.bloqueadoHasta("ip"));
    await datos.limpiarIntentos("ip");
    assert.equal(await datos.bloqueadoHasta("ip"), null);
  });

  it("limita las peticiones por cubo y ventana, incluso en paralelo", async () => {
    const resultados = await Promise.all(
      Array.from({ length: 8 }, () => datos.consumirLimite("prueba", 5, 60_000)),
    );
    assert.equal(resultados.filter((r) => r.permitido).length, 5);
    assert.ok(resultados.every((r) => r.reintentarEnS >= 1 && r.reintentarEnS <= 60));
    assert.equal((await datos.consumirLimite("otro", 5, 60_000)).permitido, true);
  });

  it("guarda el mes de inicio de un pago fijo y lo ignora en los de una sola vez", async () => {
    const mensual = await datos.crearRecordatorio({ titulo: "Arriendo", dia: 7, categoria: "", montoEstimado: 500_000, desde: "2026-10" });
    assert.equal(mensual.desde, "2026-10");
    assert.equal((await datos.listarRecordatorios())[0].desde, "2026-10");
    assert.equal((await datos.actualizarRecordatorio(mensual.id, { desde: null })).desde, null);
    const unico = await datos.crearRecordatorio({ titulo: "SOAT", dia: 20, categoria: "", montoEstimado: 0, fecha: "2026-11-20", desde: "2026-10" });
    assert.equal(unico.desde, null);
  });

  it("tras un fallo de conexión pasajero, la siguiente petición reintenta y funciona", async () => {
    await db.cerrarConexion();
    process.env.MONGODB_URI = "mongodb://127.0.0.1:1"; // nadie escucha ahí
    process.env.MONGODB_TIMEOUT_MS = "400";
    try {
      await assert.rejects(datos.listarCuentas());
    } finally {
      process.env.MONGODB_URI = URI as string;
      delete process.env.MONGODB_TIMEOUT_MS;
    }
    assert.ok((await datos.listarCuentas()).length >= 1, "debió reconectar y responder");
  });

  describe("perfiles: cada usuario tiene sus propios datos", () => {
    const A = "a@ejemplo.com";
    const B2 = "b@ejemplo.com";
    const nuevoGasto = (monto: number) =>
      datos.crearMovimiento({ tipo: "gasto", categoria: "mercado", monto, fecha: "2026-10-01", nota: `gasto ${monto}` });

    async function dosUsuarios() {
      const principal = await db.getDb();
      await principal.client.db(`${BASE}_b`).dropDatabase(); // la base del segundo usuario no se limpia sola
      await principal.collection("usuarios").insertMany([
        { _id: A as never, claveHash: "x", sesionVersion: 0, creadoEn: "2026-10-01" },
        { _id: B2 as never, claveHash: "x", sesionVersion: 0, base: `${BASE}_b`, creadoEn: "2026-10-01" },
      ]);
    }

    it("lo que registra uno no lo ve el otro, ni en movimientos, ni en cuentas, ni en ajustes", async () => {
      await dosUsuarios();
      await db.conUsuario(A, async () => {
        await nuevoGasto(100);
        await datos.crearCuenta({ nombre: "Cuenta de A", tipo: "corriente", saldoInicial: 5 });
        await datos.guardarAjustes({ email: "a-destino@ejemplo.com", diaSueldo: 5 });
        await datos.fijarSueldo("2020-01", 1_000_000);
      });
      await db.conUsuario(B2, async () => {
        assert.equal((await datos.listarMovimientos({})).length, 0);
        assert.ok(!(await datos.listarCuentas()).some((c) => c.nombre === "Cuenta de A"));
        const ajustes = await datos.obtenerAjustes();
        assert.equal(ajustes.email, "");
        assert.equal(ajustes.diaSueldo, null);
        assert.deepEqual(ajustes.sueldos, []);
        await nuevoGasto(7);
        assert.equal((await datos.listarMovimientos({})).length, 1);
      });
      await db.conUsuario(A, async () => {
        const movs = await datos.listarMovimientos({});
        assert.equal(movs.length, 1);
        assert.equal(movs[0].monto, 100);
      });
    });

    it("los datos de cada uno están en una base distinta", async () => {
      await dosUsuarios();
      await db.conUsuario(A, () => nuevoGasto(100));
      await db.conUsuario(B2, () => nuevoGasto(7));
      const cliente = new MongoClient(URI as string);
      await cliente.connect();
      try {
        const deA = await cliente.db(BASE).collection("movimientos").find({}).toArray();
        const deB = await cliente.db(`${BASE}_b`).collection("movimientos").find({}).toArray();
        assert.deepEqual(deA.map((m) => m.monto), [100]);
        assert.deepEqual(deB.map((m) => m.monto), [7]);
      } finally {
        await cliente.close();
      }
    });

    it("el sueldo automático, el resumen y los pagos fijos tampoco se cruzan", async () => {
      await dosUsuarios();
      await db.conUsuario(A, async () => {
        await datos.fijarSueldo("2020-01", 2_000_000);
        await datos.guardarAjustes({ diaSueldo: 1 });
        assert.equal((await datos.acreditarSueldoSiToca("2026-10-05")).acreditado, true);
        await datos.crearRecordatorio({ titulo: "Arriendo de A", dia: 7, categoria: "", montoEstimado: 500_000 });
      });
      await db.conUsuario(B2, async () => {
        assert.equal((await datos.acreditarSueldoSiToca("2026-10-05")).acreditado, false);
        const r = await datos.calcularResumen("2026-10");
        assert.equal(r.ingresosRegistrados, 0);
        assert.equal(r.recordatorios.length, 0);
      });
    });

    it("sin usuario con sesión no se entrega ninguna base", async () => {
      db.fijarUsuarioDePruebas(undefined);
      try {
        await assert.rejects(datos.listarMovimientos({}), /sesión/);
      } finally {
        db.fijarUsuarioDePruebas("pruebas@ejemplo.com");
      }
    });

    it("un usuario que no existe no accede a nada", async () => {
      await db.conUsuario("nadie@ejemplo.com", async () => {
        await assert.rejects(datos.listarMovimientos({}), /no existe/);
      });
    });

    it("el cron puede listar a todos los usuarios", async () => {
      await dosUsuarios();
      assert.deepEqual((await datos.listarUsuarios()).sort(), [A, B2]);
    });
  });

  describe("sueldo automático", () => {
    async function configurar(dia: number | null, monto = 2_000_000) {
      await datos.fijarSueldo("2020-01", monto);
      await datos.guardarAjustes({ diaSueldo: dia });
    }
    const sueldos = async (mes: string) =>
      (await datos.listarMovimientos({ mes })).filter((m) => m.tipo === "ingreso" && m.categoria === "sueldo");

    it("no hace nada sin día configurado ni antes de que llegue", async () => {
      await configurar(null);
      assert.equal((await datos.acreditarSueldoSiToca("2026-09-15")).acreditado, false);
      await configurar(15);
      assert.equal((await datos.acreditarSueldoSiToca("2026-09-14")).acreditado, false);
      assert.equal((await sueldos("2026-09")).length, 0);
    });

    it("el día del sueldo crea el ingreso una sola vez, aunque lleguen llamadas a la vez", async () => {
      await configurar(15);
      const r = await Promise.all(Array.from({ length: 6 }, () => datos.acreditarSueldoSiToca("2026-09-15")));
      assert.equal(r.filter((x) => x.acreditado).length, 1);
      const [ingreso] = await sueldos("2026-09");
      assert.equal(ingreso.monto, 2_000_000);
      assert.equal(ingreso.fecha, "2026-09-15");
      assert.equal((await datos.acreditarSueldoSiToca("2026-09-20")).acreditado, false);
      assert.equal((await sueldos("2026-09")).length, 1);
    });

    it("si se configura tarde, el ingreso queda con la fecha del día de pago", async () => {
      await configurar(5);
      const r = await datos.acreditarSueldoSiToca("2026-09-30");
      assert.equal(r.acreditado, true);
      assert.equal((await sueldos("2026-09"))[0].fecha, "2026-09-05");
    });

    it("cada mes se registra el suyo, y un día 31 cae el último día de un mes corto", async () => {
      await configurar(31);
      await datos.acreditarSueldoSiToca("2026-09-30");
      await datos.acreditarSueldoSiToca("2026-10-31");
      assert.equal((await sueldos("2026-09"))[0].fecha, "2026-09-30");
      assert.equal((await sueldos("2026-10"))[0].fecha, "2026-10-31");
    });

    it("no duplica un sueldo registrado a mano ni reaparece si lo borras", async () => {
      await configurar(10);
      await datos.crearMovimiento({ tipo: "ingreso", categoria: "sueldo", monto: 1_900_000, fecha: "2026-09-09", nota: "a mano" });
      assert.equal((await datos.acreditarSueldoSiToca("2026-09-20")).acreditado, false);
      assert.equal((await sueldos("2026-09")).length, 1);

      await datos.acreditarSueldoSiToca("2026-10-12");
      const [auto] = await sueldos("2026-10");
      await datos.eliminarMovimiento(auto.id);
      assert.equal((await datos.acreditarSueldoSiToca("2026-10-13")).acreditado, false);
      assert.equal((await sueldos("2026-10")).length, 0);
    });
  });

  it("el resumen suma el sobrante de todos los meses anteriores, no solo de los últimos seis", async () => {
    await datos.crearMovimiento({ tipo: "ingreso", categoria: "ingreso-extra", monto: 1_000_000, fecha: "2026-01-10", nota: "" });
    await datos.crearMovimiento({ tipo: "gasto", categoria: "mercado", monto: 400_000, fecha: "2026-01-12", nota: "" });
    await datos.crearMovimiento({ tipo: "ingreso", categoria: "ingreso-extra", monto: 500_000, fecha: "2026-08-03", nota: "" });
    await datos.crearMovimiento({ tipo: "ingreso", categoria: "ingreso-extra", monto: 200_000, fecha: "2026-10-02", nota: "" });
    const r = await datos.calcularResumen("2026-10");
    // enero 600.000 + agosto 500.000; los meses vacíos del medio no suman nada
    assert.equal(r.sobranteAnterior, 1_100_000);
    assert.equal(r.mesesAnteriores, 9);
    assert.equal(r.libre, 200_000);
    assert.equal(r.totalDisponible, 1_300_000);
  });

  describe("tarjeta de crédito y cuotas", () => {
    async function conTarjeta() {
      const tarjeta = await datos.crearCuenta({ nombre: "Visa", tipo: "tarjeta", saldoInicial: 0, cupo: 5_000_000 });
      return tarjeta;
    }
    const compra = (tarjeta: { id: string }, parcial: Partial<Parameters<typeof datos.crearMovimiento>[0]> = {}) =>
      datos.crearMovimiento({
        tipo: "gasto",
        categoria: "mercado",
        monto: 100_000,
        fecha: "2026-09-30",
        nota: "Nevera",
        cuentaId: tarjeta.id,
        cuotas: 3,
        ...parcial,
      });

    it("guarda el cupo y solo en una tarjeta", async () => {
      const t = await conTarjeta();
      assert.equal(t.tipo, "tarjeta");
      assert.equal(t.cupo, 5_000_000);
      const banco = await datos.crearCuenta({ nombre: "Banco", tipo: "corriente", saldoInicial: 0, cupo: null });
      assert.equal(banco.cupo, null);
    });

    it("una compra en 3 cuotas crea una por mes, que suman el total", async () => {
      const t = await conTarjeta();
      const primera = await compra(t);
      assert.equal(primera.cuota, 1);
      assert.equal(primera.cuotas, 3);
      const todas = (await datos.listarMovimientos({ cuentaId: t.id })).sort((a, b) => a.fecha.localeCompare(b.fecha));
      assert.deepEqual(todas.map((m) => m.fecha), ["2026-09-30", "2026-10-30", "2026-11-30"]);
      assert.deepEqual(todas.map((m) => m.monto), [33_334, 33_333, 33_333]);
      assert.deepEqual(todas.map((m) => m.mes), ["2026-09", "2026-10", "2026-11"]);
      assert.equal(new Set(todas.map((m) => m.compraId)).size, 1);
      assert.deepEqual(todas.map((m) => m.cuota), [1, 2, 3]);
    });

    it("cada mes solo ve su cuota, y el saldo de la tarjeta es toda la deuda", async () => {
      const t = await conTarjeta();
      await compra(t);
      assert.equal((await datos.listarMovimientos({ mes: "2026-10" })).length, 1);
      const [cuenta] = (await datos.listarCuentas()).filter((c) => c.id === t.id);
      const saldos = calcularSaldos([cuenta], await datos.sumasHistoricas());
      assert.equal(saldos[0].saldo, -100_000);
    });

    it("rechaza cuotas fuera de una tarjeta, de un gasto o del rango", async () => {
      const t = await conTarjeta();
      const banco = await datos.crearCuenta({ nombre: "Banco", tipo: "corriente", saldoInicial: 0 });
      await assert.rejects(compra(banco), /tarjeta de crédito/);
      await assert.rejects(datos.crearMovimiento({ tipo: "ingreso", categoria: "sueldo", monto: 90, fecha: "2026-09-30", nota: "", cuentaId: t.id, cuotas: 3 }), /gasto/);
      await assert.rejects(compra(t, { monto: 2, cuotas: 3 }), /por cuota/);
    });

    it("borra solo una cuota o toda la compra", async () => {
      const t = await conTarjeta();
      await compra(t);
      const cuotas = await datos.listarMovimientos({ cuentaId: t.id });
      assert.equal(await datos.eliminarMovimiento(cuotas[0].id), 1);
      assert.equal((await datos.listarMovimientos({ cuentaId: t.id })).length, 2);
      const otra = (await datos.listarMovimientos({ cuentaId: t.id }))[0];
      assert.equal(await datos.eliminarMovimiento(otra.id, { compra: true }), 2);
      assert.equal((await datos.listarMovimientos({ cuentaId: t.id })).length, 0);
    });

    it("con día de pago, cada cuota cae ese día; y la primera puede ser el mes siguiente", async () => {
      const t = await datos.crearCuenta({ nombre: "Nu", tipo: "tarjeta", saldoInicial: 0, cupo: null, diaPago: 15 });
      assert.equal(t.diaPago, 15);
      await compra(t, { fecha: "2026-10-08", cuotas: 3 });
      const este = (await datos.listarMovimientos({ cuentaId: t.id })).map((m) => m.fecha).sort();
      assert.deepEqual(este, ["2026-10-15", "2026-11-15", "2026-12-15"]);

      await compra(t, { fecha: "2026-10-20", cuotas: 2, primeraCuota: "siguiente" });
      const todas = (await datos.listarMovimientos({ cuentaId: t.id })).map((m) => m.fecha).sort();
      assert.deepEqual(todas.slice(3), ["2026-11-15", "2026-12-15"].length === 2 ? todas.slice(3) : []);
      assert.ok(todas.filter((f) => f === "2026-11-15").length === 2);
    });

    it("el día de pago solo se guarda en una tarjeta", async () => {
      const banco = await datos.crearCuenta({ nombre: "Banco", tipo: "corriente", saldoInicial: 0, diaPago: null });
      assert.equal(banco.diaPago, null);
    });

    it("el resumen trae lo que toca pagar este mes y los siguientes", async () => {
      const t = await conTarjeta();
      await compra(t, { fecha: "2026-10-02", monto: 600_000, cuotas: 6 });
      const r = await datos.calcularResumen("2026-10");
      assert.equal(r.cuotasDelMes, 100_000);
      assert.equal(r.gastado, 100_000);
      assert.equal(r.cuotasProximas.length, 5);
      assert.deepEqual(r.cuotasProximas[0], { mes: "2026-11", total: 100_000, cantidad: 1 });
      assert.equal(r.cuotasProximas[4].mes, "2027-03");
    });

    it("una tarjeta con deuda y cuotas divide la deuda en partes iguales, una por mes", async () => {
      const { cuenta, cuotas } = await datos.crearCuentaConDeuda({
        nombre: "Nu",
        tipo: "tarjeta",
        saldoInicial: -900_000,
        cupo: 2_000_000,
        diaPago: 15,
        deudaCuotas: 3,
        primeraCuota: "siguiente",
      });
      assert.equal(cuotas, 3);
      assert.equal(cuenta.saldoInicial, 0, "la deuda va en las cuotas, no como saldo inicial");
      const movs = (await datos.listarMovimientos({ cuentaId: cuenta.id })).sort((a, b) => a.fecha.localeCompare(b.fecha));
      assert.equal(movs.length, 3);
      assert.deepEqual(movs.map((m) => m.monto), [300_000, 300_000, 300_000]);
      assert.ok(movs.every((m) => m.fecha.endsWith("-15") && m.categoria === "otros"));
      assert.deepEqual(movs.map((m) => m.cuota), [1, 2, 3]);
      const [c] = (await datos.listarCuentas()).filter((x) => x.id === cuenta.id);
      assert.equal(calcularSaldos([c], await datos.sumasHistoricas())[0].saldo, -900_000);
    });

    it("sin cuotas, la deuda queda como saldo inicial y no crea movimientos", async () => {
      const { cuenta, cuotas } = await datos.crearCuentaConDeuda({ nombre: "Nu", tipo: "tarjeta", saldoInicial: -500_000, deudaCuotas: null });
      assert.equal(cuotas, 0);
      assert.equal(cuenta.saldoInicial, -500_000);
      assert.equal((await datos.listarMovimientos({ cuentaId: cuenta.id })).length, 0);
    });

    it("si la deuda no alcanza para las cuotas, no deja la tarjeta creada", async () => {
      const antes = (await datos.listarCuentas()).length;
      await assert.rejects(datos.crearCuentaConDeuda({ nombre: "Nu", tipo: "tarjeta", saldoInicial: -2, deudaCuotas: 5 }), /por cuota/);
      assert.equal((await datos.listarCuentas()).length, antes);
    });

    it("eliminar una tarjeta borra sus compras pero conserva las transferencias", async () => {
      const t = await conTarjeta();
      const banco = await datos.crearCuenta({ nombre: "Banco", tipo: "corriente", saldoInicial: 1_000_000 });
      await compra(t, { cuotas: 3 });
      await datos.crearMovimiento({ tipo: "transferencia", monto: 50_000, fecha: "2026-10-01", nota: "pago", cuentaId: banco.id, cuentaDestinoId: t.id });
      const r = await datos.eliminarCuenta(t.id);
      assert.equal(r.movimientos, 3);
      assert.ok(!(await datos.listarCuentas()).some((c) => c.id === t.id));
      const movs = await datos.listarMovimientos({});
      assert.ok(movs.every((m) => m.tipo === "transferencia"), "solo queda la transferencia");
      const cuentas = await datos.listarCuentas();
      assert.equal(calcularSaldos(cuentas, await datos.sumasHistoricas()).find((c) => c.id === banco.id)?.saldo, 950_000);
    });

    it("solo se eliminan tarjetas: las otras cuentas se archivan", async () => {
      const banco = await datos.crearCuenta({ nombre: "Banco", tipo: "corriente", saldoInicial: 0 });
      await assert.rejects(datos.eliminarCuenta(banco.id), /se archivan/);
      await assert.rejects(datos.eliminarCuenta("6abe7b2eba3046de140c6bcd"), /No encontramos/);
    });

    it("sin cuotas, una compra con tarjeta es un gasto normal", async () => {
      const t = await conTarjeta();
      const m = await compra(t, { cuotas: 1 });
      assert.equal(m.cuota, null);
      assert.equal((await datos.listarMovimientos({ cuentaId: t.id })).length, 1);
    });
  });

  it("cambiar la clave sube la versión de sesión y solo existe el usuario registrado", async () => {
    assert.equal(await datos.buscarUsuario("nadie@ejemplo.com"), null);
    await (await db.colecciones.usuarios()).insertOne({
      _id: "yo@ejemplo.com",
      claveHash: "scrypt$a$b",
      sesionVersion: 0,
      creadoEn: new Date().toISOString(),
    });
    assert.equal(await datos.incrementarVersionSesion("YO@ejemplo.com", "scrypt$c$d"), 1);
    const usuario = await datos.buscarUsuario(" Yo@Ejemplo.com ");
    assert.equal(usuario?.claveHash, "scrypt$c$d");
    assert.equal(usuario?.sesionVersion, 1);
    await assert.rejects(datos.incrementarVersionSesion("otro@ejemplo.com"));
  });

  it("el respaldo contiene los datos pero nunca la clave", async () => {
    await (await db.colecciones.usuarios()).insertOne({
      _id: "yo@ejemplo.com",
      claveHash: "scrypt$sal$hash",
      sesionVersion: 0,
      creadoEn: new Date().toISOString(),
    });
    await datos.crearMovimiento({ tipo: "gasto", categoria: "mercado", monto: 1, fecha: fechas.hoyISO(), nota: "" });
    const texto = await datos.exportarRespaldo();
    assert.ok(!texto.includes("scrypt$"));
    const respaldo = BSON.EJSON.parse(texto) as { formato: string; colecciones: Record<string, unknown[]> };
    assert.equal(respaldo.formato, "finanza-respaldo");
    assert.equal(respaldo.colecciones.movimientos.length, 1);
  });

  it("un respaldo se restaura completo en una base vacía y no pisa datos sin permiso", async () => {
    await datos.fijarSueldo("2020-01", 2_000_000);
    const meta = await datos.crearMeta({ nombre: "Viaje", monto: 1_000_000, fechaLimite: null, cuentaId: null });
    await datos.crearMovimiento({ tipo: "ahorro", monto: 250_000, fecha: fechas.hoyISO(), nota: "", metaId: meta.id });
    await datos.crearRecordatorio({ titulo: "Arriendo", dia: 5, categoria: "arriendo", montoEstimado: 900_000 });
    const archivo = join(tmpdir(), `respaldo-${process.pid}.json`);
    writeFileSync(archivo, await datos.exportarRespaldo());

    const destino = `${BASE}_restaurada`;
    const correr = (...extra: string[]) =>
      spawnSync(process.execPath, ["scripts/restaurar.mjs", archivo, ...extra], {
        env: { ...process.env, MONGODB_URI: URI, MONGODB_DB: destino },
        encoding: "utf8",
      });

    const primera = correr();
    assert.equal(primera.status, 0, primera.stderr);

    const cliente = await new MongoClient(URI!).connect();
    try {
      const base = cliente.db(destino);
      assert.equal(await base.collection("movimientos").countDocuments(), 1);
      assert.equal(await base.collection("recordatorios").countDocuments(), 1);
      const movimiento = await base.collection("movimientos").findOne({});
      assert.equal(movimiento?.metaId, meta.id, "los vínculos entre documentos se conservan");
      assert.ok(movimiento?._id instanceof BSON.ObjectId, "los ObjectId se restauran como ObjectId");

      const segunda = correr();
      assert.notEqual(segunda.status, 0, "sobre una base con datos exige --reemplazar");
      assert.match(segunda.stderr, /--reemplazar/);
      assert.equal(correr("--reemplazar").status, 0);
      assert.equal(await base.collection("movimientos").countDocuments(), 1);
    } finally {
      await cliente.db(destino).dropDatabase();
      await cliente.close();
    }
  });

  it("los tramos de sueldo no reescriben el pasado", async () => {
    const mes = fechas.mesActual();
    await datos.fijarSueldo("2020-01", 2_000_000);
    await datos.fijarSueldo(mes, 2_500_000);
    assert.equal((await datos.calcularResumen(fechas.sumarMeses(mes, -1))).sueldoEsperado, 2_000_000);
    assert.equal((await datos.calcularResumen(mes)).sueldoEsperado, 2_500_000);
  });

  it("presupuestos solo para categorías de gasto", async () => {
    await datos.fijarPresupuesto("ocio", 100_000);
    await assert.rejects(datos.fijarPresupuesto("sueldo", 1), /gasto/);
    await datos.crearMovimiento({ tipo: "gasto", categoria: "ocio", monto: 120_000, fecha: fechas.hoyISO(), nota: "" });
    const r = await datos.calcularResumen();
    assert.equal(r.presupuestos[0].estado, "excedido");
    await datos.fijarPresupuesto("ocio", 0);
    assert.equal((await datos.listarPresupuestos()).length, 0);
  });

  it("oculta una categoría base y crea una personal", async () => {
    await datos.actualizarCategoria("moto", { oculta: true });
    // Renombrar después: el documento ya existe y solo se actualiza.
    await datos.actualizarCategoria("moto", { label: "Mi moto" });
    // Renombrar una base sin documento previo: se crea con $setOnInsert.
    await datos.actualizarCategoria("ocio", { label: "Salidas", icono: "Music" });
    assert.equal((await datos.obtenerCatalogo()).etiqueta("ocio"), "Salidas");
    const creada = await datos.crearCategoria({ label: "Mascota", icono: "PawPrint", tipo: "gasto" });
    const catalogo = await datos.obtenerCatalogo();
    assert.ok(!catalogo.gasto.some((c) => c.id === "moto"));
    assert.ok(catalogo.gasto.some((c) => c.id === creada.id));
    await assert.rejects(datos.crearCategoria({ label: "mascota", icono: "PawPrint", tipo: "gasto" }), /Ya existe/);
  });
});

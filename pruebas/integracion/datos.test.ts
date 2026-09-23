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
    await datos.guardarAjustes({ email: "yo@ejemplo.com", enviarSiempre: true });
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
    await datos.guardarAjustes({ email: "yo@ejemplo.com", enviarSiempre: true });
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

  it("el respaldo contiene los datos pero nunca la clave", async () => {
    await datos.incrementarVersionSesion("scrypt$sal$hash");
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

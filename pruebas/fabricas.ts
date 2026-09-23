import type { EntradaResumen } from "../src/lib/finanzas";
import type { Ajustes, Cuenta, Meta, Movimiento, Recordatorio } from "../src/lib/types";

let secuencia = 0;
const id = (prefijo: string) => `${prefijo}-${++secuencia}`;

export function movimiento(parcial: Partial<Movimiento> = {}): Movimiento {
  const fecha = parcial.fecha ?? "2026-09-10";
  return {
    id: id("mov"),
    tipo: "gasto",
    categoria: "mercado",
    monto: 10_000,
    fecha,
    mes: fecha.slice(0, 7),
    nota: "",
    cuentaId: "principal",
    cuentaDestinoId: null,
    metaId: null,
    recurrenteId: null,
    creadoEn: `${fecha}T12:00:00.000Z`,
    ...parcial,
  };
}

export function recordatorio(parcial: Partial<Recordatorio> = {}): Recordatorio {
  return {
    id: id("rec"),
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

export function meta(parcial: Partial<Meta> = {}): Meta {
  return {
    id: id("meta"),
    nombre: "Moto nueva",
    monto: 20_000_000,
    fechaLimite: null,
    cuentaId: null,
    principal: true,
    archivada: false,
    creadoEn: "2026-01-01T00:00:00.000Z",
    ...parcial,
  };
}

export function cuenta(parcial: Partial<Cuenta> = {}): Cuenta {
  return {
    id: id("cuenta"),
    nombre: "Principal",
    tipo: "corriente",
    saldoInicial: 0,
    archivada: false,
    creadoEn: "2026-01-01T00:00:00.000Z",
    ...parcial,
  };
}

export function ajustes(parcial: Partial<Ajustes> = {}): Ajustes {
  return {
    sueldos: [{ desde: "2020-01", monto: 2_000_000 }],
    email: "yo@ejemplo.com",
    emailActivo: true,
    enviarSiempre: false,
    diasAviso: 3,
    respaldoSemanal: true,
    actualizadoEn: "2026-09-01T00:00:00.000Z",
    ...parcial,
  };
}

/** Entrada mínima de un resumen para el 21 de septiembre de 2026. */
export function entrada(parcial: Partial<EntradaResumen> = {}): EntradaResumen {
  const movimientosMes = parcial.movimientosMes ?? [];
  return {
    mes: "2026-09",
    hoy: "2026-09-21",
    ajustes: ajustes(),
    movimientosMes,
    movimientosMesReal: parcial.movimientosMesReal ?? movimientosMes,
    recordatorios: [],
    metas: [],
    cuentas: [cuenta({ id: "principal" })],
    presupuestos: [],
    sumas: [],
    serie: [],
    ...parcial,
  };
}

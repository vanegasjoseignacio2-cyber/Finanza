/**
 * Traduce cuerpos JSON de las peticiones a datos tipados. Lo que depende de lo
 * que hay en la base (que la cuenta exista, que la categoría sea de gasto) lo
 * valida `datos.ts`.
 */
import type { DatosMovimiento } from "./datos";
import {
  comoDia,
  comoFecha,
  comoFechaOpcional,
  comoIdOpcional,
  comoMonto,
  comoTexto,
  comoTipo,
  comoTipoCuenta,
} from "./validacion";

export function datosMovimiento(c: Record<string, unknown>): DatosMovimiento {
  return {
    tipo: comoTipo(c.tipo),
    monto: comoMonto(c.monto),
    fecha: comoFecha(c.fecha),
    nota: comoTexto(c.nota, "nota", 160, false),
    categoria: typeof c.categoria === "string" ? c.categoria : undefined,
    cuentaId: comoIdOpcional(c.cuentaId),
    cuentaDestinoId: comoIdOpcional(c.cuentaDestinoId),
    metaId: comoIdOpcional(c.metaId),
    recurrenteId: comoIdOpcional(c.recurrenteId),
  };
}

export function datosRecordatorio(c: Record<string, unknown>) {
  return {
    titulo: comoTexto(c.titulo, "nombre", 80),
    dia: comoDia(c.dia),
    categoria: typeof c.categoria === "string" ? c.categoria : "",
    montoEstimado: comoMonto(c.montoEstimado ?? 0, "monto estimado", true),
  };
}

export function datosMeta(c: Record<string, unknown>) {
  return {
    nombre: comoTexto(c.nombre, "nombre", 60),
    monto: comoMonto(c.monto, "monto de la meta"),
    fechaLimite: comoFechaOpcional(c.fechaLimite),
    cuentaId: comoIdOpcional(c.cuentaId),
  };
}

export function datosCuenta(c: Record<string, unknown>) {
  return {
    nombre: comoTexto(c.nombre, "nombre", 40),
    tipo: comoTipoCuenta(c.tipo),
    saldoInicial: Math.round(Number(c.saldoInicial ?? 0)) || 0,
  };
}

/**
 * Traduce cuerpos JSON de las peticiones a datos tipados. Lo que depende de lo
 * que hay en la base (que la cuenta exista, que la categoría sea de gasto) lo
 * valida `datos.ts`.
 */
import type { DatosMovimiento } from "./datos";
import {
  comoCuotas,
  comoDia,
  comoFecha,
  comoFechaOpcional,
  comoIdOpcional,
  comoMes,
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
    cuotas: comoCuotas(c.cuotas),
  };
}

export function datosRecordatorio(c: Record<string, unknown>) {
  // Con fecha es un gasto de una sola vez y el día sale de ella.
  const fecha = comoFechaOpcional(c.fecha);
  const desde = c.desde === undefined || c.desde === null || c.desde === "" ? null : comoMes(c.desde);
  return {
    titulo: comoTexto(c.titulo, "nombre", 80),
    dia: fecha ? Number(fecha.slice(8, 10)) : comoDia(c.dia),
    fecha,
    categoria: typeof c.categoria === "string" ? c.categoria : "",
    montoEstimado: comoMonto(c.montoEstimado ?? 0, "monto estimado", true),
    // El mes de inicio solo aplica a los pagos que se repiten.
    desde: fecha ? null : desde,
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
  const tipo = comoTipoCuenta(c.tipo);
  const vacio = c.cupo === undefined || c.cupo === null || c.cupo === "";
  return {
    nombre: comoTexto(c.nombre, "nombre", 40),
    tipo,
    saldoInicial: Math.round(Number(c.saldoInicial ?? 0)) || 0,
    // El cupo solo tiene sentido en una tarjeta de crédito.
    cupo: tipo === "tarjeta" && !vacio ? comoMonto(c.cupo, "cupo", true) || null : null,
  };
}

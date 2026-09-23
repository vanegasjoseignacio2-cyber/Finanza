/**
 * Cálculos puros del dominio. Nada aquí toca la base ni la red: todo lo que el
 * panel y el correo afirman sobre tu plata sale de estas funciones y se prueba
 * desde `pruebas/`.
 */
import { CATALOGO_BASE, type Catalogo } from "./categorias";
import { pesos } from "./dinero";
import {
  diasDelMes,
  diasEntre,
  mesCorto,
  mesesEntre,
  proximoVencimiento,
  sumarMeses,
} from "./fechas";
import type {
  Ajustes,
  Alerta,
  Cuenta,
  CuentaConSaldo,
  Meta,
  MetaCalculada,
  Movimiento,
  Presupuesto,
  PresupuestoCalculado,
  PuntoTendencia,
  Recordatorio,
  RecordatorioCalculado,
  Resumen,
  ResumenCategoria,
  TipoMovimiento,
  TramoSueldo,
} from "./types";

/* ─── Sueldo ─────────────────────────────────────────────────────────────── */

/** Sueldo vigente en un mes: el último tramo que empezó en ese mes o antes. */
export function sueldoPara(sueldos: TramoSueldo[], mes: string): number {
  let vigente = 0;
  let desdeVigente = "";
  for (const tramo of sueldos) {
    if (tramo.desde <= mes && tramo.desde >= desdeVigente) {
      vigente = tramo.monto;
      desdeVigente = tramo.desde;
    }
  }
  return vigente;
}

/* ─── Categorías ─────────────────────────────────────────────────────────── */

export function agruparPorCategoria(movimientos: Movimiento[]): ResumenCategoria[] {
  const totales = new Map<string, number>();
  for (const m of movimientos) {
    if (m.tipo !== "gasto") continue;
    totales.set(m.categoria, (totales.get(m.categoria) ?? 0) + m.monto);
  }
  const suma = [...totales.values()].reduce((a, b) => a + b, 0);
  return [...totales.entries()]
    .map(([categoria, total]) => ({
      categoria,
      total,
      porcentaje: suma ? Math.round((total / suma) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/* ─── Pagos fijos (recordatorios) ────────────────────────────────────────── */

/** Gasto vinculado que paga un recordatorio en un mes dado, si existe. */
function pagoVinculado(
  recordatorioId: string,
  mes: string,
  movimientos: Movimiento[],
): Movimiento | null {
  return (
    movimientos.find(
      (m) => m.tipo === "gasto" && m.recurrenteId === recordatorioId && m.mes === mes,
    ) ?? null
  );
}

/**
 * Estado de cada pago fijo frente a hoy.
 *
 * Un pago cuenta como hecho SOLO si hay un gasto vinculado a él este mes o si
 * se marcó a mano. Antes bastaba con cualquier gasto de la misma categoría, y
 * un cambio de aceite dejaba "pagado" el seguro de la moto.
 *
 * Mientras no se pague, el vencimiento es el de este mes (y puede estar vencido).
 * Una vez pagado, el siguiente vencimiento pasa al mes que viene.
 */
export function calcularRecordatorios(
  recordatorios: Recordatorio[],
  movimientosDelMes: Movimiento[],
  hoy: string,
): RecordatorioCalculado[] {
  const mes = hoy.slice(0, 7);

  return recordatorios
    .map((r) => {
      const pago = pagoVinculado(r.id, mes, movimientosDelMes);
      const pagado = pago !== null || r.pagados.includes(mes);
      const vencimientoEsteMes = `${mes}-${String(Math.min(r.dia, diasDelMes(mes))).padStart(2, "0")}`;
      const vencimiento = pagado
        ? proximoVencimiento(r.dia, `${sumarMeses(mes, 1)}-01`)
        : vencimientoEsteMes;
      const diasFaltantes = diasEntre(hoy, vencimiento);
      return {
        ...r,
        pagado,
        pagoMovimientoId: pago?.id ?? null,
        montoPagado: pago?.monto ?? null,
        vencimiento,
        diasFaltantes,
        vencido: !pagado && r.activo && diasFaltantes < 0,
      };
    })
    .sort((a, b) => {
      if (a.activo !== b.activo) return a.activo ? -1 : 1;
      if (a.pagado !== b.pagado) return a.pagado ? 1 : -1;
      return a.diasFaltantes - b.diasFaltantes;
    });
}

/** Pagos que merecen un correo: activos, sin pagar y dentro del margen (o vencidos). */
export function recordatoriosParaAvisar(
  calculados: RecordatorioCalculado[],
  diasAviso: number,
): RecordatorioCalculado[] {
  return calculados.filter((r) => r.activo && !r.pagado && r.diasFaltantes <= diasAviso);
}

/** Pagos fijos de un mes que aún no se han pagado en ese mes. */
export function fijosPendientesDelMes(
  recordatorios: Recordatorio[],
  mes: string,
  movimientosDelMes: Movimiento[],
): Recordatorio[] {
  return recordatorios.filter(
    (r) =>
      r.activo &&
      !r.pagados.includes(mes) &&
      pagoVinculado(r.id, mes, movimientosDelMes) === null,
  );
}

/* ─── Metas ──────────────────────────────────────────────────────────────── */

/** Suma histórica agrupada, tal como sale de la base. */
export interface SumaAgrupada {
  tipo: TipoMovimiento;
  cuentaId: string | null;
  cuentaDestinoId: string | null;
  metaId: string | null;
  total: number;
  primerMes: string;
}

export function calcularMetas(
  metas: Meta[],
  sumas: SumaAgrupada[],
  movimientosDelMes: Movimiento[],
  hoy: string,
): MetaCalculada[] {
  const mesReal = hoy.slice(0, 7);
  const principal = metas.find((m) => m.principal) ?? metas[0];
  // Los aportes antiguos sin meta se atribuyen a la meta principal.
  const idDe = (metaId: string | null) => metaId ?? principal?.id ?? "";

  return metas.map((meta) => {
    let ahorrado = 0;
    let primerMes: string | null = null;
    for (const s of sumas) {
      if (idDe(s.metaId) !== meta.id) continue;
      if (s.tipo === "ahorro") {
        ahorrado += s.total;
        if (!primerMes || s.primerMes < primerMes) primerMes = s.primerMes;
      }
      if (s.tipo === "retiro") ahorrado -= s.total;
    }
    ahorrado = Math.max(0, ahorrado);

    const aportadoEsteMes = movimientosDelMes
      .filter((m) => idDe(m.metaId) === meta.id)
      .reduce((s, m) => s + (m.tipo === "ahorro" ? m.monto : m.tipo === "retiro" ? -m.monto : 0), 0);

    // El ritmo se mide sobre TODOS los meses desde el primer aporte, incluidos
    // los meses sin aporte. Dividir solo entre meses con aporte infla el ritmo.
    const mesesTranscurridos = primerMes ? Math.max(1, mesesEntre(primerMes, mesReal)) : 0;
    const promedioMensual = mesesTranscurridos ? ahorrado / mesesTranscurridos : 0;

    const falta = Math.max(0, meta.monto - ahorrado);
    const mesesRestantes =
      meta.monto <= 0
        ? null
        : falta === 0
          ? 0
          : promedioMensual > 0
            ? Math.ceil(falta / promedioMensual)
            : null;

    let mesesHastaLimite: number | null = null;
    let cuotaSugerida: number | null = null;
    if (meta.fechaLimite && falta > 0) {
      const dias = diasEntre(hoy, meta.fechaLimite);
      mesesHastaLimite = dias > 0 ? Math.max(1, Math.round(dias / 30.44)) : 0;
      // La cuota se calcula sobre lo que faltaba al empezar el mes, para que un
      // aporte hecho hoy no la haga bajar y luego se descuente dos veces.
      const faltaAlEmpezarMes = falta + Math.max(0, aportadoEsteMes);
      cuotaSugerida =
        mesesHastaLimite > 0 ? Math.ceil(faltaAlEmpezarMes / mesesHastaLimite) : falta;
    }

    return {
      ...meta,
      ahorrado,
      progreso: meta.monto > 0 ? Math.min(100, Math.round((ahorrado / meta.monto) * 100)) : 0,
      aportadoEsteMes,
      promedioMensual,
      mesesRestantes,
      mesesHastaLimite,
      cuotaSugerida,
    };
  });
}

/** Lo que falta apartar este mes para ir al día con las metas que tienen fecha. */
export function cuotaPendienteDelMes(metas: MetaCalculada[]): number {
  return metas
    .filter((m) => !m.archivada && m.cuotaSugerida !== null)
    .reduce((s, m) => s + Math.max(0, (m.cuotaSugerida ?? 0) - Math.max(0, m.aportadoEsteMes)), 0);
}

/* ─── Cuentas ────────────────────────────────────────────────────────────── */

export function cuentaPrincipal(cuentas: Cuenta[]): Cuenta | undefined {
  return (
    cuentas.find((c) => !c.archivada && c.tipo === "corriente") ??
    cuentas.find((c) => !c.archivada) ??
    cuentas[0]
  );
}

/**
 * Saldo de cada cuenta = saldo inicial + todo lo registrado que la toca.
 * Los movimientos antiguos sin cuenta pertenecen a la cuenta principal.
 */
export function calcularSaldos(cuentas: Cuenta[], sumas: SumaAgrupada[]): CuentaConSaldo[] {
  const principalId = cuentaPrincipal(cuentas)?.id ?? "";
  const saldo = new Map(cuentas.map((c) => [c.id, c.saldoInicial]));
  const mover = (id: string | null, delta: number) => {
    const clave = id ?? principalId;
    if (saldo.has(clave)) saldo.set(clave, (saldo.get(clave) ?? 0) + delta);
  };

  for (const s of sumas) {
    switch (s.tipo) {
      case "gasto":
        mover(s.cuentaId, -s.total);
        break;
      case "ingreso":
        mover(s.cuentaId, s.total);
        break;
      case "transferencia":
        mover(s.cuentaId, -s.total);
        if (s.cuentaDestinoId) mover(s.cuentaDestinoId, s.total);
        break;
      case "ahorro":
        mover(s.cuentaId, -s.total);
        if (s.cuentaDestinoId) mover(s.cuentaDestinoId, s.total);
        break;
      case "retiro":
        mover(s.cuentaId, s.total);
        if (s.cuentaDestinoId) mover(s.cuentaDestinoId, -s.total);
        break;
    }
  }
  return cuentas.map((c) => ({ ...c, saldo: saldo.get(c.id) ?? c.saldoInicial }));
}

/* ─── Presupuestos ───────────────────────────────────────────────────────── */

export const UMBRAL_CERCA = 85;

export function calcularPresupuestos(
  presupuestos: Presupuesto[],
  movimientosDelMes: Movimiento[],
): PresupuestoCalculado[] {
  return presupuestos
    .filter((p) => p.tope > 0)
    .map((p) => {
      const gastado = movimientosDelMes
        .filter((m) => m.tipo === "gasto" && m.categoria === p.categoria)
        .reduce((s, m) => s + m.monto, 0);
      const porcentaje = Math.round((gastado / p.tope) * 100);
      return {
        ...p,
        gastado,
        porcentaje,
        estado:
          porcentaje >= 100 ? ("excedido" as const) : porcentaje >= UMBRAL_CERCA ? ("cerca" as const) : ("ok" as const),
      };
    })
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

/* ─── Tendencia ──────────────────────────────────────────────────────────── */

export interface FilaMensual {
  mes: string;
  tipo: TipoMovimiento;
  categoria: string;
  total: number;
}

export function calcularTendencia(
  filas: FilaMensual[],
  hasta: string,
  sueldos: TramoSueldo[],
  meses = 6,
): PuntoTendencia[] {
  const puntos: PuntoTendencia[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const mes = sumarMeses(hasta, -i);
    const delMes = filas.filter((f) => f.mes === mes);
    const suma = (tipo: TipoMovimiento) =>
      delMes.filter((f) => f.tipo === tipo).reduce((s, f) => s + f.total, 0);
    const conSueldo = delMes.some((f) => f.tipo === "ingreso" && f.categoria === "sueldo");
    puntos.push({
      mes,
      etiqueta: mesCorto(mes),
      ingreso: suma("ingreso") + (conSueldo ? 0 : sueldoPara(sueldos, mes)),
      gastado: suma("gasto"),
      ahorrado: suma("ahorro") - suma("retiro"),
    });
  }
  return puntos;
}

/* ─── Resumen ────────────────────────────────────────────────────────────── */

export interface EntradaResumen {
  mes: string;
  hoy: string;
  ajustes: Ajustes;
  /** Movimientos del mes que se consulta. */
  movimientosMes: Movimiento[];
  /** Movimientos del mes en curso: los pagos fijos se juzgan contra hoy. */
  movimientosMesReal: Movimiento[];
  recordatorios: Recordatorio[];
  metas: Meta[];
  cuentas: Cuenta[];
  presupuestos: Presupuesto[];
  sumas: SumaAgrupada[];
  serie: FilaMensual[];
  catalogo?: Catalogo;
}

export function componerResumen(e: EntradaResumen): Resumen {
  const catalogo = e.catalogo ?? CATALOGO_BASE;
  const mesReal = e.hoy.slice(0, 7);
  const momento = e.mes < mesReal ? "pasado" : e.mes > mesReal ? "futuro" : "actual";
  const movs = e.movimientosMes;
  const suma = (tipo: TipoMovimiento) =>
    movs.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.monto, 0);

  // Ingreso: lo registrado, más el sueldo esperado mientras no se registre.
  const sueldoEsperado = sueldoPara(e.ajustes.sueldos, e.mes);
  const sueldoRegistrado = movs.some((m) => m.tipo === "ingreso" && m.categoria === "sueldo");
  const ingresosRegistrados = suma("ingreso");
  const ingresoTotal = ingresosRegistrados + (sueldoRegistrado ? 0 : sueldoEsperado);

  const gastado = suma("gasto");
  const ahorroNeto = suma("ahorro") - suma("retiro");

  // Pagos fijos que todavía salen este mes. En un mes cerrado ya no aplica.
  // Si se consulta el mes en curso, ambas listas son el mismo mes: se usa una sola
  // para que nunca puedan contradecirse.
  const movimientosDeHoy = momento === "actual" ? movs : e.movimientosMesReal;
  const recordatorios = calcularRecordatorios(e.recordatorios, movimientosDeHoy, e.hoy);
  let fijosPendientesLista: RecordatorioCalculado[] = [];
  if (momento === "actual") {
    fijosPendientesLista = recordatorios.filter((r) => r.activo && !r.pagado);
  } else if (momento === "futuro") {
    const pendientes = new Set(
      fijosPendientesDelMes(e.recordatorios, e.mes, movs).map((r) => r.id),
    );
    fijosPendientesLista = recordatorios.filter((r) => pendientes.has(r.id));
  }
  const fijosPendientes = fijosPendientesLista.reduce((s, r) => s + r.montoEstimado, 0);
  const fijosSinMonto = fijosPendientesLista.filter((r) => r.montoEstimado <= 0).length;

  const libre = ingresoTotal - gastado - ahorroNeto - fijosPendientes;

  const diasRestantes =
    momento === "actual"
      ? diasDelMes(e.mes) - Number(e.hoy.slice(8, 10)) + 1
      : momento === "futuro"
        ? diasDelMes(e.mes)
        : null;
  const porDia = diasRestantes ? Math.max(0, Math.floor(libre / diasRestantes)) : null;

  const metas = calcularMetas(e.metas, e.sumas, movs, e.hoy);
  const cuotaMetasPendiente = momento === "actual" ? cuotaPendienteDelMes(metas) : 0;
  const porDiaTrasMetas =
    diasRestantes && cuotaMetasPendiente > 0
      ? Math.max(0, Math.floor((libre - cuotaMetasPendiente) / diasRestantes))
      : null;

  const presupuestos = calcularPresupuestos(e.presupuestos, movs);

  const resumen: Resumen = {
    mes: e.mes,
    hoy: e.hoy,
    momento,
    sueldoEsperado,
    sueldoRegistrado,
    ingresosRegistrados,
    ingresoTotal,
    gastado,
    ahorroNeto,
    fijosPendientes,
    fijosPendientesLista,
    fijosSinMonto,
    libre,
    diasRestantes,
    porDia,
    cuotaMetasPendiente,
    porDiaTrasMetas,
    categorias: agruparPorCategoria(movs),
    presupuestos,
    tendencia: calcularTendencia(e.serie, e.mes, e.ajustes.sueldos),
    movimientos: movs,
    recordatorios,
    metas: metas.filter((m) => !m.archivada),
    cuentas: calcularSaldos(e.cuentas, e.sumas).filter((c) => !c.archivada),
    alertas: [],
    ajustes: e.ajustes,
  };
  resumen.alertas = generarAlertas(resumen, catalogo);
  return resumen;
}

/* ─── Alertas ────────────────────────────────────────────────────────────── */

function lista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/**
 * Solo lo que pide una decisión, de más a menos urgente. Nada de consejos de
 * relleno: si no hay nada que decir, la lista queda vacía.
 */
export function generarAlertas(r: Resumen, catalogo: Catalogo = CATALOGO_BASE): Alerta[] {
  const alertas: Alerta[] = [];
  const enCurso = r.momento === "actual";

  if (enCurso && r.libre < 0) {
    alertas.push({
      tono: "riesgo",
      clave: "libre",
      texto:
        r.fijosPendientes > 0
          ? `Contando los ${pesos(r.fijosPendientes)} en pagos fijos que faltan, este mes te faltan ${pesos(Math.abs(r.libre))}.`
          : `Este mes ya gastaste ${pesos(Math.abs(r.libre))} más de lo que entra.`,
    });
  }

  if (enCurso) {
    const vencidos = r.recordatorios.filter((x) => x.vencido);
    if (vencidos.length > 0) {
      alertas.push({
        tono: "riesgo",
        clave: "vencidos",
        texto:
          vencidos.length === 1
            ? `${vencidos[0].titulo} venció hace ${Math.abs(vencidos[0].diasFaltantes)} ${Math.abs(vencidos[0].diasFaltantes) === 1 ? "día" : "días"} y no está registrado como pagado.`
            : `Tienes ${vencidos.length} pagos vencidos sin registrar: ${lista(vencidos.map((v) => v.titulo))}.`,
      });
    }
  }

  const excedidos = r.presupuestos.filter((p) => p.estado === "excedido");
  if (excedidos.length === 1) {
    const p = excedidos[0];
    alertas.push({
      tono: "riesgo",
      clave: "presupuesto",
      texto: `Te pasaste del tope en ${catalogo.etiqueta(p.categoria)}: ${pesos(p.gastado)} de ${pesos(p.tope)}.`,
    });
  } else if (excedidos.length > 1) {
    alertas.push({
      tono: "riesgo",
      clave: "presupuesto",
      texto: `Te pasaste del tope en ${lista(excedidos.map((p) => catalogo.etiqueta(p.categoria)))}.`,
    });
  }

  const cerca = r.presupuestos.filter((p) => p.estado === "cerca");
  if (cerca.length > 0) {
    alertas.push({
      tono: "aviso",
      clave: "presupuesto",
      texto:
        cerca.length === 1
          ? `${catalogo.etiqueta(cerca[0].categoria)} va en ${cerca[0].porcentaje}% del tope y quedan ${r.diasRestantes ?? 0} días.`
          : `${lista(cerca.map((p) => catalogo.etiqueta(p.categoria)))} ya pasan del ${UMBRAL_CERCA}% del tope.`,
    });
  }

  for (const meta of r.metas) {
    if (meta.cuotaSugerida && meta.mesesHastaLimite && meta.promedioMensual < meta.cuotaSugerida) {
      alertas.push({
        tono: "aviso",
        clave: "meta",
        texto: `Para ${meta.nombre} a tiempo harían falta ${pesos(meta.cuotaSugerida)} al mes y tu ritmo es de ${pesos(meta.promedioMensual)}. Sube el aporte o mueve la fecha.`,
      });
    }
  }

  if (r.fijosSinMonto > 0) {
    alertas.push({
      tono: "info",
      clave: "sin-monto",
      texto: `${r.fijosSinMonto} ${r.fijosSinMonto === 1 ? "pago fijo no tiene" : "pagos fijos no tienen"} monto estimado, así que lo libre no los descuenta.`,
    });
  }

  if (enCurso && !r.sueldoRegistrado && r.sueldoEsperado > 0) {
    alertas.push({
      tono: "info",
      clave: "sueldo",
      texto: `El sueldo de este mes todavía no está registrado; el cálculo asume que llegan ${pesos(r.sueldoEsperado)}.`,
    });
  }

  return alertas;
}

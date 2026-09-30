/**
 * Modelo de datos.
 *
 * Tipos de movimiento:
 * - gasto:         sale plata de una cuenta.
 * - ingreso:       entra plata a una cuenta (el sueldo es un ingreso de categoría "sueldo").
 * - ahorro:        aporte a una meta. Sale de lo disponible del mes.
 * - retiro:        saca plata de una meta. Vuelve a lo disponible del mes.
 * - transferencia: mueve plata entre cuentas. No cambia gasto ni ingreso.
 */
export type TipoMovimiento = "gasto" | "ingreso" | "ahorro" | "retiro" | "transferencia";

export type TipoCuenta = "corriente" | "efectivo" | "ahorro";

export interface Cuenta {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  saldoInicial: number;
  archivada: boolean;
  creadoEn: string;
}

export interface CuentaConSaldo extends Cuenta {
  saldo: number;
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  categoria: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
  mes: string; // YYYY-MM
  nota: string;
  /** Cuenta donde pega el movimiento (de donde sale el gasto, adonde entra el ingreso). */
  cuentaId: string;
  /**
   * La otra cuenta cuando hay dos: destino de una transferencia o de un aporte,
   * origen de un retiro (la cuenta donde vive la meta).
   */
  cuentaDestinoId: string | null;
  metaId: string | null;
  /** Pago fijo al que corresponde este gasto, si lo hay. */
  recurrenteId: string | null;
  creadoEn: string;
}

export interface Recordatorio {
  id: string;
  titulo: string;
  dia: number; // 1-31
  categoria: string;
  montoEstimado: number;
  activo: boolean;
  /**
   * Meses (YYYY-MM) marcados como pagados SIN registrar un gasto (lo pagó otra
   * persona, o ya estaba registrado por otro lado). Lo normal es registrar el
   * pago, que crea un gasto vinculado.
   */
  pagados: string[];
  /**
   * Gasto programado una sola vez (YYYY-MM-DD): un cumpleaños, un aniversario.
   * Solo cuenta en su mes; `dia` es el día de esta fecha. null = se repite cada mes.
   */
  fecha: string | null;
  /**
   * Mes (YYYY-MM) desde el que cuenta un pago que se repite cada mes. Antes de
   * ese mes no está vencido ni descuenta de lo libre. null = cuenta desde ya.
   */
  desde: string | null;
  creadoEn: string;
}

export interface RecordatorioCalculado extends Recordatorio {
  pagado: boolean;
  /** Gasto vinculado que lo pagó este mes, si existe. */
  pagoMovimientoId: string | null;
  montoPagado: number | null;
  vencimiento: string; // YYYY-MM-DD
  diasFaltantes: number;
  vencido: boolean;
  /** Cae en el mes en curso. Falso solo en gastos programados para un mes que viene. */
  esteMes: boolean;
}

export interface Meta {
  id: string;
  nombre: string;
  monto: number;
  fechaLimite: string | null;
  /** Cuenta donde vive la plata de esta meta (opcional). */
  cuentaId: string | null;
  /** Recibe los aportes antiguos que no tenían meta asignada. */
  principal: boolean;
  archivada: boolean;
  creadoEn: string;
}

export interface MetaCalculada extends Meta {
  ahorrado: number;
  progreso: number; // 0-100
  aportadoEsteMes: number;
  /** Promedio sobre los meses transcurridos desde el primer aporte, no solo los meses con aporte. */
  promedioMensual: number;
  mesesRestantes: number | null;
  mesesHastaLimite: number | null;
  cuotaSugerida: number | null;
}

export interface Presupuesto {
  categoria: string;
  tope: number;
}

export type EstadoPresupuesto = "ok" | "cerca" | "excedido";

export interface PresupuestoCalculado extends Presupuesto {
  gastado: number;
  porcentaje: number;
  estado: EstadoPresupuesto;
}

export interface CategoriaPersonal {
  id: string;
  label: string;
  icono: string;
  tipo: "gasto" | "ingreso";
  oculta: boolean;
}

/** El sueldo cambia con el tiempo: cada tramo aplica desde su mes en adelante. */
export interface TramoSueldo {
  desde: string; // YYYY-MM
  monto: number;
}

export interface Ajustes {
  sueldos: TramoSueldo[];
  email: string;
  emailActivo: boolean;
  /** Día del mes (1-31) en que llega el sueldo y se registra solo. null = se registra a mano. */
  diaSueldo: number | null;
  diasAviso: number;
  respaldoSemanal: boolean;
  actualizadoEn: string;
}

export interface ResumenCategoria {
  categoria: string;
  total: number;
  porcentaje: number;
}

export interface PuntoTendencia {
  mes: string;
  etiqueta: string;
  ingreso: number;
  gastado: number;
  ahorrado: number;
}

export type TonoAlerta = "riesgo" | "aviso" | "info";

export type ClaveAlerta = "libre" | "vencidos" | "presupuesto" | "meta" | "sin-monto" | "sueldo";

export interface Alerta {
  tono: TonoAlerta;
  clave: ClaveAlerta;
  texto: string;
}

export type EstadoEnvio = "enviando" | "enviado" | "error" | "omitido";

export interface Envio {
  fecha: string;
  estado: EstadoEnvio;
  intentoEn: string;
  destinatario?: string;
  asunto?: string;
  error?: string;
  motivo?: string;
  avisos?: number;
  respaldo?: boolean;
}

export interface Resumen {
  mes: string;
  hoy: string;
  momento: "pasado" | "actual" | "futuro";

  sueldoEsperado: number;
  sueldoRegistrado: boolean;
  ingresosRegistrados: number;
  /** Registrados + el sueldo esperado si todavía no llegó. */
  ingresoTotal: number;

  gastado: number;
  /** Aportes menos retiros del mes. */
  ahorroNeto: number;
  /** Pagos fijos de este mes que aún no se pagan (con su monto estimado). */
  fijosPendientes: number;
  fijosPendientesLista: RecordatorioCalculado[];
  fijosSinMonto: number;

  /** Lo que de verdad queda para gastar: ingreso − gastado − ahorro − fijos pendientes. */
  libre: number;
  diasRestantes: number | null;
  /** Cuota de metas con fecha límite que falta apartar este mes. */
  cuotaMetasPendiente: number;

  categorias: ResumenCategoria[];
  presupuestos: PresupuestoCalculado[];
  tendencia: PuntoTendencia[];
  movimientos: Movimiento[];
  recordatorios: RecordatorioCalculado[];
  metas: MetaCalculada[];
  cuentas: CuentaConSaldo[];
  alertas: Alerta[];
  ajustes: Ajustes;
}

/**
 * Portada del calendario, por mes (clave YYYY-MM) o para todos los meses
 * (clave "todos"). "auto" es el fondo que rota solo cada mes.
 */
export type Portada =
  | { tipo: "auto" }
  | { tipo: "fondo"; fondo: number }
  | { tipo: "enlace"; url: string }
  // La imagen se sirve aparte (/api/portadas/<clave>); `version` cambia al
  // reemplazarla para que el navegador no muestre la anterior desde su caché.
  | { tipo: "imagen"; version: string };

export type Portadas = Record<string, Portada>;

import {
  calcularResumen,
  cerrarEnvio,
  exportarRespaldo,
  obtenerAjustes,
  obtenerCatalogo,
  registrarOmitido,
  reservarEnvio,
} from "./datos";
import { enviarCorreo, proveedorConfigurado, type Adjunto } from "./email/enviar";
import { construirCorreoDiario } from "./email/plantilla";
import { diaSemana, hoyISO } from "./fechas";
import { recordatoriosParaAvisar } from "./finanzas";

export interface ResultadoDiario {
  enviado: boolean;
  motivo?: string;
  destinatario?: string;
  asunto?: string;
  avisos?: number;
  respaldo?: boolean;
  proveedor?: string;
  error?: string;
}

interface Opciones {
  /** Ignora el interruptor de Ajustes, el filtro de novedades y la reserva del día. */
  forzar?: boolean;
  /** Dirección alternativa (correo de prueba). */
  destino?: string;
  urlApp?: string;
  /** Sustituto del envío real, para las pruebas. */
  enviar?: typeof enviarCorreo;
}

const LUNES = 1;

/**
 * Lo que ejecuta el cron cada día. Es seguro llamarlo varias veces o desde dos
 * disparadores a la vez: el envío del día se reserva de forma atómica antes de
 * mandar nada, así que solo una llamada llega a enviar.
 */
export async function ejecutarRecordatorioDiario(opciones: Opciones = {}): Promise<ResultadoDiario> {
  const { forzar = false } = opciones;
  const enviar = opciones.enviar ?? enviarCorreo;
  const ajustes = await obtenerAjustes();

  if (!ajustes.emailActivo && !forzar) {
    return { enviado: false, motivo: "El aviso por correo está apagado en Ajustes." };
  }

  const destinatario = opciones.destino || ajustes.email || process.env.REMINDER_EMAIL || "";
  if (!destinatario) {
    return { enviado: false, motivo: "No hay un correo de destino configurado." };
  }

  const hoy = hoyISO();
  const [resumen, catalogo] = await Promise.all([calcularResumen(hoy.slice(0, 7)), obtenerCatalogo()]);
  const avisos = recordatoriosParaAvisar(resumen.recordatorios, ajustes.diasAviso);
  const conRespaldo = ajustes.respaldoSemanal && diaSemana(hoy) === LUNES;

  // Hay algo que contar si vence un pago, hay una alerta seria o toca respaldo.
  const hayNovedad =
    avisos.length > 0 ||
    resumen.alertas.some((a) => a.tono === "riesgo") ||
    conRespaldo ||
    ajustes.enviarSiempre;

  if (!hayNovedad && !forzar) {
    const motivo = "Sin pagos por vencer ni alertas, y el resumen diario está desactivado.";
    await registrarOmitido(hoy, motivo);
    return { enviado: false, motivo };
  }

  if (!forzar && !(await reservarEnvio(hoy))) {
    return { enviado: false, motivo: `El correo de ${hoy} ya se envió o se está enviando.` };
  }

  const urlApp = opciones.urlApp || process.env.APP_URL || "http://localhost:3000";
  const correo = construirCorreoDiario({ resumen, avisos, hoy, urlApp, conRespaldo, catalogo });
  const adjuntos: Adjunto[] = conRespaldo
    ? [
        {
          nombre: `finanza-respaldo-${hoy}.json`,
          contenido: await exportarRespaldo(),
          tipo: "application/json",
        },
      ]
    : [];

  const resultado = await enviar({ para: destinatario, ...correo, adjuntos });

  if (!forzar) {
    await cerrarEnvio(
      hoy,
      resultado.ok
        ? { estado: "enviado", destinatario, asunto: correo.asunto, avisos: avisos.length, respaldo: conRespaldo }
        : { estado: "error", destinatario, error: resultado.error },
    );
  }

  if (!resultado.ok) {
    return { enviado: false, error: resultado.error, proveedor: resultado.proveedor, destinatario };
  }
  return {
    enviado: true,
    destinatario,
    asunto: correo.asunto,
    avisos: avisos.length,
    respaldo: conRespaldo,
    proveedor: resultado.proveedor ?? proveedorConfigurado(),
  };
}

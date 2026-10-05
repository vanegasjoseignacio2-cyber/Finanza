import {
  calcularResumen,
  cerrarEnvio,
  exportarRespaldo,
  obtenerAjustes,
  obtenerCatalogo,
  reservarEnvio,
} from "./datos";
import { enviarCorreo, proveedorConfigurado, type Adjunto } from "./email/enviar";
import { URL_APP_OFICIAL } from "./email/enlaces";
import { construirCorreoDiario } from "./email/plantilla";
import { diaSemana, horaActual as horaDeAhora, hoyISO, textoHora } from "./fechas";
import { esHoraDelAviso, recordatoriosParaAvisar } from "./finanzas";

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
  /** Ignora el interruptor de Ajustes, la hora elegida y la reserva del día. */
  forzar?: boolean;
  /** Dirección alternativa (correo de prueba). */
  destino?: string;
  /** Correo con que entra el usuario: es el destino si no eligió otro en Ajustes. */
  usuario?: string;
  /** Dirección de la app para los botones del correo. Por defecto, el enlace oficial. */
  urlApp?: string;
  /** Hora actual (0-23) en la zona de la app, para las pruebas. */
  hora?: number;
  /** Sustituto del envío real, para las pruebas. */
  enviar?: typeof enviarCorreo;
}

const LUNES = 1;

/**
 * Lo que ejecuta el cron: los pagos por atender y el recordatorio de anotar los
 * gastos. El disparo corre cada hora, pero a cada persona le sale una sola vez al
 * día, a la hora que eligió en Ajustes (o dentro de las horas de gracia, si el
 * disparo se atrasó). Es seguro llamarlo varias veces o desde dos disparadores a
 * la vez: el envío del día se reserva de forma atómica antes de mandar nada, así
 * que solo una llamada llega a enviar.
 */
export async function ejecutarRecordatorioDiario(opciones: Opciones = {}): Promise<ResultadoDiario> {
  const { forzar = false } = opciones;
  const enviar = opciones.enviar ?? enviarCorreo;
  const ajustes = await obtenerAjustes();

  if (!ajustes.emailActivo && !forzar) {
    return { enviado: false, motivo: "El aviso por correo está apagado en Ajustes." };
  }

  if (!forzar && !esHoraDelAviso(opciones.hora ?? horaDeAhora(), ajustes.horaAviso)) {
    return { enviado: false, motivo: `Aún no es la hora del aviso (${textoHora(ajustes.horaAviso)}) o ya pasó por hoy.` };
  }

  const destinatario = opciones.destino || ajustes.email || opciones.usuario || "";
  if (!destinatario) {
    return { enviado: false, motivo: "No hay un correo de destino configurado." };
  }

  const hoy = hoyISO();
  const [resumen, catalogo] = await Promise.all([calcularResumen(hoy.slice(0, 7)), obtenerCatalogo()]);
  const avisos = recordatoriosParaAvisar(resumen.recordatorios, ajustes.diasAviso);
  const conRespaldo = ajustes.respaldoSemanal && diaSemana(hoy) === LUNES;

  if (!forzar && !(await reservarEnvio(hoy))) {
    return { enviado: false, motivo: `El correo de ${hoy} ya se envió o se está enviando.` };
  }

  const urlApp = opciones.urlApp || URL_APP_OFICIAL;
  const correo = construirCorreoDiario({ avisos, hoy, urlApp, conRespaldo, catalogo });
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

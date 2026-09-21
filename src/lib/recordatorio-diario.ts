import { getDb } from "./db";
import { calcularResumen, obtenerAjustes } from "./datos";
import { enviarCorreo, proveedorConfigurado } from "./email/enviar";
import { construirCorreoDiario } from "./email/plantilla";
import { recordatoriosParaAvisar } from "./finanzas";
import { hoyISO } from "./fechas";

export interface ResultadoDiario {
  enviado: boolean;
  motivo?: string;
  destinatario?: string;
  asunto?: string;
  avisos?: number;
  proveedor?: string;
  error?: string;
}

interface Opciones {
  /** Ignora el interruptor de ajustes, el filtro de novedades y el registro de envíos. */
  forzar?: boolean;
  /** Dirección alternativa (para el correo de prueba desde Ajustes). */
  destino?: string;
  urlApp?: string;
}

/**
 * Corazón del recordatorio diario: lo llaman el cron y el botón de prueba.
 * Es idempotente — si ya se envió el correo de hoy, no manda otro.
 */
export async function ejecutarRecordatorioDiario(
  opciones: Opciones = {},
): Promise<ResultadoDiario> {
  const { forzar = false } = opciones;
  const ajustes = await obtenerAjustes();

  if (!ajustes.emailActivo && !forzar) {
    return { enviado: false, motivo: "El recordatorio por correo está apagado en Ajustes." };
  }

  const destinatario = opciones.destino || ajustes.email || process.env.REMINDER_EMAIL || "";
  if (!destinatario) {
    return { enviado: false, motivo: "No hay un correo de destino configurado." };
  }

  const hoy = hoyISO();
  const resumen = await calcularResumen(hoy.slice(0, 7));
  const avisos = recordatoriosParaAvisar(resumen.recordatorios, ajustes.diasAviso);

  if (avisos.length === 0 && !ajustes.enviarSiempre && !forzar) {
    return {
      enviado: false,
      motivo: "Hoy no hay pagos próximos y el resumen diario siempre está desactivado.",
    };
  }

  const db = await getDb();
  if (!forzar) {
    // El registro de envíos evita correos duplicados si el cron se dispara dos veces.
    const yaEnviado = await db
      .collection<{ _id: string }>("envios")
      .findOne({ _id: hoy });
    if (yaEnviado) {
      return { enviado: false, motivo: `El correo de ${hoy} ya se había enviado.` };
    }
  }

  const urlApp = opciones.urlApp || process.env.APP_URL || "https://localhost:3000";
  const correo = construirCorreoDiario(resumen, avisos, hoy, urlApp);
  const resultado = await enviarCorreo({
    para: destinatario,
    asunto: correo.asunto,
    html: correo.html,
    texto: correo.texto,
  });

  if (!resultado.ok) {
    return {
      enviado: false,
      error: resultado.error,
      proveedor: resultado.proveedor,
      destinatario,
    };
  }

  if (!forzar) {
    await db.collection<{ _id: string }>("envios").updateOne(
      { _id: hoy },
      {
        $set: {
          _id: hoy,
          enviadoEn: new Date().toISOString(),
          destinatario,
          asunto: correo.asunto,
          avisos: avisos.length,
          proveedor: resultado.proveedor,
        },
      },
      { upsert: true },
    );
  }

  return {
    enviado: true,
    destinatario,
    asunto: correo.asunto,
    avisos: avisos.length,
    proveedor: resultado.proveedor ?? proveedorConfigurado(),
  };
}

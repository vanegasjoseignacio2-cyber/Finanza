import { proveedorConfigurado } from "./enviar";

export interface DiagnosticoCorreo {
  proveedor: string;
  credenciales: boolean;
  remitente: boolean;
  cron: boolean;
}

/** Estado de la configuración del servidor: solo banderas, nunca credenciales. */
export function diagnosticoCorreo(): DiagnosticoCorreo {
  const proveedor = proveedorConfigurado();
  const credenciales =
    proveedor === "resend"
      ? Boolean(process.env.RESEND_API_KEY)
      : Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return {
    proveedor,
    credenciales,
    remitente: Boolean(process.env.EMAIL_FROM || process.env.SMTP_USER),
    cron: Boolean(process.env.CRON_SECRET),
  };
}

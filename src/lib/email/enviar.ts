import nodemailer from "nodemailer";
import { Resend } from "resend";

export type Proveedor = "resend" | "smtp";

export interface CorreoSalida {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

export interface ResultadoEnvio {
  ok: boolean;
  proveedor: Proveedor;
  id?: string;
  error?: string;
}

export function proveedorConfigurado(): Proveedor {
  const explicito = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (explicito === "resend" || explicito === "smtp") return explicito;
  // Sin elección explícita se deduce de las credenciales presentes.
  return process.env.RESEND_API_KEY ? "resend" : "smtp";
}

function remitente(): string {
  return (
    process.env.EMAIL_FROM ||
    (proveedorConfigurado() === "resend"
      ? "Finanza <onboarding@resend.dev>"
      : process.env.SMTP_USER ||
        "")
  );
}

export async function enviarCorreo(correo: CorreoSalida): Promise<ResultadoEnvio> {
  const proveedor = proveedorConfigurado();
  const from = remitente();
  if (!from) {
    return { ok: false, proveedor, error: "Falta EMAIL_FROM (o SMTP_USER) para el remitente." };
  }

  try {
    if (proveedor === "resend") {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) return { ok: false, proveedor, error: "Falta RESEND_API_KEY." };
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from,
        to: correo.para,
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      });
      if (error) return { ok: false, proveedor, error: error.message };
      return { ok: true, proveedor, id: data?.id };
    }

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      return {
        ok: false,
        proveedor,
        error: "Faltan SMTP_HOST, SMTP_USER o SMTP_PASS.",
      };
    }
    const puerto = Number(process.env.SMTP_PORT ?? 465);
    const transporte = nodemailer.createTransport({
      host,
      port: puerto,
      secure: puerto === 465,
      auth: { user, pass },
    });
    const info = await transporte.sendMail({
      from,
      to: correo.para,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
    });
    return { ok: true, proveedor, id: info.messageId };
  } catch (error) {
    return {
      ok: false,
      proveedor,
      error: error instanceof Error ? error.message : "Error desconocido al enviar.",
    };
  }
}

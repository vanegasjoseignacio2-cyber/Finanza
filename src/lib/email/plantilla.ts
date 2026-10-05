import { CATALOGO_BASE, type Catalogo } from "../categorias";
import { pesos } from "../dinero";
import { fechaCorta, fechaLarga } from "../fechas";
import type { RecordatorioCalculado } from "../types";

const TINTA = "#f5f5f5";
const TINTA_SUAVE = "#b8b8b8";
const TINTA_TENUE = "#8f8f8f";
const FONDO = "#000000";
const CUERPO = "#0b0b0b";
const PANEL_ALTO = "#1f1f1f";
const BORDE = "#2a2a2a";
const BLANCO = "#ffffff";
const VERDE = "#34d399";
const ROJO = "#fb7185";
const AMBAR = "#fbbf24";
const FUENTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

type Tono = "riesgo" | "aviso" | "normal";

const COLOR_TONO: Record<Tono, string> = { riesgo: ROJO, aviso: AMBAR, normal: TINTA_SUAVE };
const FONDO_TONO: Record<Tono, string> = { riesgo: "#2a1118", aviso: "#2a2209", normal: PANEL_ALTO };

function urgencia(dias: number): { texto: string; tono: Tono } {
  if (dias < 0) {
    const n = Math.abs(dias);
    return { texto: `Vencido hace ${n} ${n === 1 ? "día" : "días"}`, tono: "riesgo" };
  }
  if (dias === 0) return { texto: "Vence hoy", tono: "riesgo" };
  if (dias === 1) return { texto: "Vence mañana", tono: "aviso" };
  return { texto: `En ${dias} días`, tono: "normal" };
}

const MES_3 = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/** "2026-09-28" → { dia: "28", mes: "SEP" } para el calendario en miniatura. */
function partesFecha(fecha: string): { dia: string; mes: string } {
  const [, m, d] = fecha.split("-").map(Number);
  return { dia: String(d), mes: MES_3[m - 1] };
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/* ─── Piezas compartidas ─────────────────────────────────────────────────── */

function boton(texto: string, href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td align="center" bgcolor="${BLANCO}" style="border-radius:12px;background:${BLANCO};">
      <a href="${escapar(href)}" style="display:block;padding:14px 20px;color:#000000;font-size:14px;font-weight:700;text-decoration:none;">${texto} &rarr;</a>
    </td>
  </tr></table>`;
}

function notaRespaldo(): string {
  return `<p style="margin:16px 0 0;color:${TINTA_TENUE};font-size:12px;line-height:1.5;"><span style="color:${TINTA_SUAVE};font-weight:700;">Respaldo semanal adjunto.</span> Guárdalo: con él se reconstruye todo si algún día pierdes la base.</p>`;
}

/** Marco común: cabecera con la marca y la fecha, tarjeta con el contenido y pie. */
function envoltura(o: { asunto: string; previa: string; hoy: string; urlApp: string; contenido: string }): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapar(o.asunto)}</title>
</head>
<body bgcolor="${FONDO}" style="margin:0;padding:0;background:${FONDO};color:${TINTA};font-family:${FUENTE};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(o.previa)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${FONDO}" style="background:${FONDO};padding:16px 12px 24px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;">

        <tr><td style="padding:2px 4px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td width="28" height="28" align="center" valign="middle" bgcolor="${BLANCO}" style="width:28px;height:28px;background:${BLANCO};border-radius:8px;color:#000000;font-size:15px;line-height:28px;font-weight:700;">&#8599;</td>
                <td valign="middle" style="padding-left:8px;color:${TINTA};font-size:15px;font-weight:700;">Finanza</td>
              </tr></table>
            </td>
            <td align="right" valign="middle" style="color:${TINTA_TENUE};font-size:12px;">${escapar(fechaLarga(o.hoy))}</td>
          </tr></table>
        </td></tr>

        <tr><td bgcolor="${CUERPO}" style="padding:20px;background:${CUERPO};border:1px solid ${BORDE};border-radius:18px;">
          ${o.contenido}
        </td></tr>

        <tr><td style="padding:14px 8px 0;color:${TINTA_TENUE};font-size:11px;line-height:1.6;text-align:center;">
          Aviso diario de Finanza · <a href="${escapar(`${o.urlApp}/ajustes`)}" style="color:${TINTA_TENUE};text-decoration:underline;">Cambiar o apagar</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─── Correo 1: hay pagos por atender ────────────────────────────────────── */

function filaPago(r: RecordatorioCalculado, catalogo: Catalogo): string {
  const u = urgencia(r.diasFaltantes);
  const color = COLOR_TONO[u.tono];
  const { dia, mes } = partesFecha(r.vencimiento);
  const monto = r.montoEstimado > 0 ? pesos(r.montoEstimado) : "Sin monto";
  // Si la categoría se llama igual que el pago, repetirla no dice nada.
  const categoria = r.categoria ? catalogo.etiqueta(r.categoria) : "";
  const detalle =
    categoria && categoria.toLowerCase() !== r.titulo.trim().toLowerCase()
      ? `<span style="color:${TINTA_TENUE};font-weight:400;">${escapar(categoria)} · </span>`
      : "";
  return `
        <tr>
          <td style="padding:12px 0;border-top:1px solid ${BORDE};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="48" valign="middle">
                <table role="presentation" width="44" cellpadding="0" cellspacing="0"><tr>
                  <td align="center" bgcolor="${FONDO_TONO[u.tono]}" style="width:44px;padding:7px 0;background:${FONDO_TONO[u.tono]};border-radius:10px;">
                    <span style="display:block;color:${color};font-size:17px;line-height:19px;font-weight:700;">${dia}</span>
                    <span style="display:block;color:${color};font-size:9px;line-height:11px;font-weight:700;letter-spacing:1px;">${mes}</span>
                  </td>
                </tr></table>
              </td>
              <td valign="middle" style="padding-left:10px;">
                <p style="margin:0;color:${TINTA};font-size:14px;font-weight:600;line-height:1.3;">${escapar(r.titulo)}</p>
                <p style="margin:2px 0 0;color:${color};font-size:11px;font-weight:700;">${detalle}${u.texto}</p>
              </td>
              <td align="right" valign="middle" style="padding-left:8px;white-space:nowrap;color:${TINTA};font-size:14px;font-weight:700;">${monto}</td>
            </tr></table>
          </td>
        </tr>`;
}

function contenidoPagos(o: {
  avisos: RecordatorioCalculado[];
  catalogo: Catalogo;
  urlApp: string;
  conRespaldo: boolean;
}): string {
  const { avisos } = o;
  const vencidos = avisos.filter((a) => a.diasFaltantes < 0).length;
  const total = avisos.reduce((suma, a) => suma + a.montoEstimado, 0);
  const titulo =
    vencidos > 0
      ? plural(vencidos, "pago vencido", "pagos vencidos")
      : plural(avisos.length, "pago por vencer", "pagos por vencer");
  return `
          <p style="margin:0;color:${TINTA_TENUE};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Por pagar</p>
          <p style="margin:4px 0 0;color:${vencidos > 0 ? ROJO : AMBAR};font-size:22px;line-height:1.2;font-weight:700;">${titulo}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">${avisos
            .map((r) => filaPago(r, o.catalogo))
            .join("")}
            <tr>
              <td style="padding:13px 0 0;border-top:1px solid ${BORDE};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="color:${TINTA_TENUE};font-size:12px;">Total estimado</td>
                  <td align="right" style="color:${TINTA};font-size:16px;font-weight:700;">${pesos(total)}</td>
                </tr></table>
              </td>
            </tr>
          </table>

          <div style="margin-top:20px;">${boton("Ver mis pagos fijos", `${o.urlApp}/login`)}</div>
          ${o.conRespaldo ? notaRespaldo() : ""}`;
}

/* ─── Correo 2: todo al día ──────────────────────────────────────────────── */

function contenidoTodoAlDia(o: { urlApp: string; conRespaldo: boolean }): string {
  return `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="padding:6px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td width="52" height="52" align="center" valign="middle" bgcolor="#0f2a20" style="width:52px;height:52px;background:#0f2a20;border:1px solid #1d5a42;border-radius:99px;color:${VERDE};font-size:26px;line-height:52px;font-weight:700;">&#10003;</td>
              </tr></table>
              <p style="margin:16px 0 0;color:${VERDE};font-size:22px;line-height:1.2;font-weight:700;">Todo al día</p>
              <p style="margin:8px 0 0;color:${TINTA_SUAVE};font-size:15px;line-height:1.55;">No tienes pagos por vencer.<br>Ingresa a la plataforma y registra tus gastos de hoy.</p>
            </td>
          </tr></table>

          <div style="margin-top:22px;">${boton("Registrar mis gastos", `${o.urlApp}/login`)}</div>
          ${o.conRespaldo ? notaRespaldo() : ""}`;
}

/* ─── Constructor ────────────────────────────────────────────────────────── */

export interface CorreoDiario {
  asunto: string;
  html: string;
  texto: string;
}

export interface OpcionesCorreo {
  /** Pagos que vencen pronto o ya vencieron (ver `recordatoriosParaAvisar`). */
  avisos: RecordatorioCalculado[];
  hoy: string;
  /** Dirección de la app; los botones llevan a su pantalla de entrada (`/login`). */
  urlApp: string;
  conRespaldo?: boolean;
  catalogo?: Catalogo;
}

/**
 * Dos correos distintos, según el día:
 *  - con pagos por atender: solo los pagos, con su total;
 *  - sin pagos: "todo al día" y la invitación a registrar los gastos de hoy.
 */
export function construirCorreoDiario(o: OpcionesCorreo): CorreoDiario {
  const { avisos, hoy } = o;
  const catalogo = o.catalogo ?? CATALOGO_BASE;
  const urlApp = o.urlApp.replace(/\/+$/, "");
  const conRespaldo = o.conRespaldo ?? false;
  const lineaRespaldo = conRespaldo ? ["", "Va adjunto el respaldo semanal de tus datos."] : [];

  if (avisos.length === 0) {
    const asunto = "Finanza · todo al día · registra tus gastos de hoy";
    return {
      asunto,
      html: envoltura({
        asunto,
        previa: "No tienes pagos por vencer. Ingresa y registra tus gastos de hoy.",
        hoy,
        urlApp,
        contenido: contenidoTodoAlDia({ urlApp, conRespaldo }),
      }),
      texto: [
        `Finanza — ${fechaLarga(hoy)}`,
        "",
        "Todo al día: no tienes pagos por vencer.",
        "Ingresa a la plataforma y registra tus gastos de hoy.",
        "",
        `Registrar mis gastos: ${urlApp}/login`,
        ...lineaRespaldo,
      ].join("\n"),
    };
  }

  const vencidos = avisos.filter((a) => a.diasFaltantes < 0).length;
  const total = avisos.reduce((suma, a) => suma + a.montoEstimado, 0);
  const resumen =
    vencidos > 0
      ? plural(vencidos, "pago vencido", "pagos vencidos")
      : plural(avisos.length, "pago por vencer", "pagos por vencer");
  const asunto = `Finanza · ${resumen}`;
  return {
    asunto,
    html: envoltura({
      asunto,
      previa: `${resumen}. Total estimado: ${pesos(total)}.`,
      hoy,
      urlApp,
      contenido: contenidoPagos({ avisos, catalogo, urlApp, conRespaldo }),
    }),
    texto: [
      `Finanza — ${fechaLarga(hoy)}`,
      "",
      `Por pagar (${resumen}):`,
      ...avisos.map(
        (a) =>
          `- ${a.titulo} · ${fechaCorta(a.vencimiento)} · ${urgencia(a.diasFaltantes).texto}${a.montoEstimado > 0 ? ` · ${pesos(a.montoEstimado)}` : ""}`,
      ),
      `Total estimado: ${pesos(total)}`,
      "",
      `Ver mis pagos fijos: ${urlApp}/login`,
      ...lineaRespaldo,
    ].join("\n"),
  };
}

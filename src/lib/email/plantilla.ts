import { CATALOGO_BASE, type Catalogo } from "../categorias";
import { pesos } from "../dinero";
import { fechaCorta, fechaLarga } from "../fechas";
import type { RecordatorioCalculado, Resumen } from "../types";

const TINTA = "#e9eff8";
const TINTA_SUAVE = "#a3b3c9";
const TINTA_TENUE = "#8193ab";
const FONDO = "#060c17";
const CUERPO = "#0d1729";
const TARJETA = "#132035";
const BORDE = "#22324d";
const VERDE = "#34d399";
const AZUL = "#60a5fa";
const ROJO = "#fb7185";
const AMBAR = "#fbbf24";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function urgencia(dias: number): { texto: string; color: string } {
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`, color: ROJO };
  if (dias === 0) return { texto: "Vence hoy", color: ROJO };
  if (dias === 1) return { texto: "Vence mañana", color: AMBAR };
  return { texto: `En ${dias} días`, color: TINTA_SUAVE };
}

function filaDesglose(etiqueta: string, valor: string, color = TINTA, fuerte = false): string {
  return `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${BORDE};color:${fuerte ? TINTA : TINTA_SUAVE};font-size:14px;${fuerte ? "font-weight:700;" : ""}">${etiqueta}</td>
      <td align="right" style="padding:9px 0;border-bottom:1px solid ${BORDE};color:${color};font-size:15px;font-weight:${fuerte ? 700 : 600};">${valor}</td>
    </tr>`;
}

function bloquePagos(avisos: RecordatorioCalculado[], catalogo: Catalogo): string {
  if (avisos.length === 0) {
    return `<p style="margin:0;color:${TINTA_SUAVE};font-size:14px;line-height:1.6;">No hay pagos fijos por vencer en los próximos días.</p>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${avisos
    .map((r) => {
      const u = urgencia(r.diasFaltantes);
      const monto = r.montoEstimado > 0 ? pesos(r.montoEstimado) : "Sin monto estimado";
      return `
        <tr>
          <td style="padding:13px 15px;background:${TARJETA};border:1px solid ${r.diasFaltantes < 0 ? "#5a2a38" : BORDE};border-radius:10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:${TINTA};font-size:15px;font-weight:600;">${escapar(r.titulo)}</td>
                <td align="right" style="color:${u.color};font-size:13px;font-weight:600;">${u.texto}</td>
              </tr>
              <tr>
                <td style="padding-top:4px;color:${TINTA_SUAVE};font-size:13px;">${escapar(fechaCorta(r.vencimiento))}${r.categoria ? ` · ${escapar(catalogo.etiqueta(r.categoria))}` : ""}</td>
                <td align="right" style="padding-top:4px;color:${TINTA_SUAVE};font-size:13px;">${monto}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:8px;line-height:8px;">&nbsp;</td></tr>`;
    })
    .join("")}</table>`;
}

function barra(progreso: number): string {
  const lleno = Math.max(2, Math.min(100, progreso));
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1b2a42;border-radius:999px;">
      <tr>
        <td width="${lleno}%" style="height:8px;line-height:8px;background:${VERDE};border-radius:999px;">&nbsp;</td>
        ${lleno < 100 ? `<td width="${100 - lleno}%" style="height:8px;line-height:8px;">&nbsp;</td>` : ""}
      </tr>
    </table>`;
}

export interface CorreoDiario {
  asunto: string;
  html: string;
  texto: string;
}

export interface OpcionesCorreo {
  resumen: Resumen;
  avisos: RecordatorioCalculado[];
  hoy: string;
  urlApp: string;
  conRespaldo?: boolean;
  catalogo?: Catalogo;
}

/** Titular del correo: lo mismo que responde la pantalla Hoy. */
function titular(r: Resumen): { grande: string; detalle: string; color: string } {
  if (r.libre < 0) {
    return {
      grande: `Te faltan ${pesos(Math.abs(r.libre))}`,
      detalle:
        r.fijosPendientes > 0
          ? `contando ${pesos(r.fijosPendientes)} en pagos fijos que todavía salen este mes.`
          : "para cerrar el mes sin números rojos.",
      color: ROJO,
    };
  }
  return {
    grande: `${pesos(r.porDia ?? 0)} por día`,
    detalle: `Te quedan ${pesos(r.libre)} libres para ${r.diasRestantes ?? 0} ${r.diasRestantes === 1 ? "día" : "días"}, ya descontados los pagos fijos pendientes.`,
    color: VERDE,
  };
}

export function construirCorreoDiario(o: OpcionesCorreo): CorreoDiario {
  const { resumen: r, avisos, hoy, urlApp } = o;
  const catalogo = o.catalogo ?? CATALOGO_BASE;
  const t = titular(r);
  const vencidos = avisos.filter((a) => a.diasFaltantes < 0).length;

  const asunto =
    r.libre < 0
      ? `Finanza · te faltan ${pesos(Math.abs(r.libre))} este mes`
      : vencidos > 0
        ? `Finanza · ${vencidos} ${vencidos === 1 ? "pago vencido" : "pagos vencidos"} · ${pesos(r.porDia ?? 0)} por día`
        : avisos.length > 0
          ? `Finanza · ${avisos.length} ${avisos.length === 1 ? "pago por vencer" : "pagos por vencer"} · ${pesos(r.porDia ?? 0)} por día`
          : `Finanza · ${pesos(r.porDia ?? 0)} por día hasta fin de mes`;

  const alertas = r.alertas.filter((a) => a.clave !== "libre" && a.clave !== "vencidos").slice(0, 3);
  const colorAlerta = { riesgo: ROJO, aviso: AMBAR, info: AZUL } as const;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapar(asunto)}</title>
</head>
<body style="margin:0;padding:0;background:${FONDO};color:${TINTA};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(`${t.grande}. ${t.detalle}`)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <tr><td style="padding:20px 24px;border-radius:16px 16px 0 0;background:${VERDE};background-image:linear-gradient(120deg,${VERDE} 0%,#22d3ee 55%,${AZUL} 100%);">
          <p style="margin:0;color:#04121c;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Finanza</p>
          <p style="margin:4px 0 0;color:#04121c;font-size:15px;font-weight:600;">${escapar(fechaLarga(hoy))}</p>
        </td></tr>

        <tr><td style="padding:26px 24px;background:${CUERPO};border:1px solid ${BORDE};border-top:0;border-radius:0 0 16px 16px;">

          <p style="margin:0;color:${TINTA_TENUE};font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Puedes gastar</p>
          <p style="margin:6px 0 0;color:${t.color};font-size:30px;line-height:1.15;font-weight:700;">${t.grande}</p>
          <p style="margin:8px 0 0;color:${TINTA_SUAVE};font-size:14px;line-height:1.6;">${escapar(t.detalle)}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
            ${filaDesglose(r.sueldoRegistrado ? "Ingreso del mes" : "Ingreso del mes (con sueldo esperado)", pesos(r.ingresoTotal))}
            ${filaDesglose("Gastado", `− ${pesos(r.gastado)}`)}
            ${filaDesglose("Ahorro neto", `− ${pesos(r.ahorroNeto)}`)}
            ${filaDesglose("Pagos fijos pendientes", `− ${pesos(r.fijosPendientes)}`)}
            ${filaDesglose("Libre", pesos(r.libre), r.libre < 0 ? ROJO : VERDE, true)}
          </table>

          <p style="margin:28px 0 12px;color:${TINTA};font-size:16px;font-weight:600;">Pagos fijos</p>
          ${bloquePagos(avisos, catalogo)}

          ${
            alertas.length > 0
              ? `<p style="margin:26px 0 10px;color:${TINTA};font-size:16px;font-weight:600;">Para revisar</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${alertas
            .map(
              (a) => `<tr><td style="padding:12px 14px;background:${TARJETA};border-left:3px solid ${colorAlerta[a.tono]};border-radius:0 8px 8px 0;color:${TINTA_SUAVE};font-size:14px;line-height:1.55;">${escapar(a.texto)}</td></tr><tr><td style="height:8px;line-height:8px;">&nbsp;</td></tr>`,
            )
            .join("")}</table>`
              : ""
          }

          ${
            r.metas.length > 0
              ? `<p style="margin:26px 0 12px;color:${TINTA};font-size:16px;font-weight:600;">Metas</p>
          ${r.metas
            .map(
              (m) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td style="color:${TINTA};font-size:14px;font-weight:600;padding-bottom:6px;">${escapar(m.nombre)}</td>
              <td align="right" style="color:${TINTA_SUAVE};font-size:13px;padding-bottom:6px;">${m.progreso}% · ${pesos(m.ahorrado)} de ${pesos(m.monto)}</td>
            </tr>
            <tr><td colspan="2">${barra(m.progreso)}</td></tr>
          </table>`,
            )
            .join("")}`
              : ""
          }

          ${
            o.conRespaldo
              ? `<p style="margin:22px 0 0;padding:12px 14px;background:${TARJETA};border-radius:8px;color:${TINTA_SUAVE};font-size:13px;line-height:1.55;">Va adjunto el respaldo semanal de tus datos. Guárdalo: con él se reconstruye todo si algún día pierdes la base.</p>`
              : ""
          }

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;">
            <tr><td align="center" style="border-radius:10px;background:${VERDE};">
              <a href="${escapar(urlApp)}" style="display:inline-block;padding:13px 28px;color:#04121c;font-size:15px;font-weight:700;text-decoration:none;">Abrir mi panel</a>
            </td></tr>
          </table>

          <p style="margin:22px 0 0;color:${TINTA_TENUE};font-size:12px;line-height:1.6;text-align:center;">
            Recibes este correo porque activaste el aviso diario en Finanza. Puedes apagarlo desde Ajustes.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const texto = [
    `Finanza — ${fechaLarga(hoy)}`,
    "",
    `${t.grande}. ${t.detalle}`,
    "",
    `Ingreso del mes: ${pesos(r.ingresoTotal)}${r.sueldoRegistrado ? "" : " (con sueldo esperado)"}`,
    `Gastado: − ${pesos(r.gastado)}`,
    `Ahorro neto: − ${pesos(r.ahorroNeto)}`,
    `Pagos fijos pendientes: − ${pesos(r.fijosPendientes)}`,
    `Libre: ${pesos(r.libre)}`,
    "",
    avisos.length > 0 ? "Pagos fijos:" : "No hay pagos fijos por vencer en los próximos días.",
    ...avisos.map(
      (a) =>
        `- ${a.titulo} · ${fechaCorta(a.vencimiento)} · ${urgencia(a.diasFaltantes).texto}${a.montoEstimado > 0 ? ` · ${pesos(a.montoEstimado)}` : ""}`,
    ),
    ...(alertas.length > 0 ? ["", "Para revisar:", ...alertas.map((a) => `- ${a.texto}`)] : []),
    ...(r.metas.length > 0
      ? ["", "Metas:", ...r.metas.map((m) => `- ${m.nombre}: ${pesos(m.ahorrado)} de ${pesos(m.monto)} (${m.progreso}%)`)]
      : []),
    ...(o.conRespaldo ? ["", "Va adjunto el respaldo semanal de tus datos."] : []),
    "",
    `Abrir el panel: ${urlApp}`,
  ];

  return { asunto, html, texto: texto.join("\n") };
}

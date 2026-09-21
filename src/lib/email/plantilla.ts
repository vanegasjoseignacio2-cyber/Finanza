import { etiquetaCategoria } from "../categorias";
import { pesos } from "../dinero";
import { fechaCorta, fechaLarga, nombreMes } from "../fechas";
import type { RecordatorioCalculado, Resumen } from "../types";

const TINTA = "#e6edf5";
const TINTA_SUAVE = "#93a4bd";
const FONDO = "#070d18";
const TARJETA = "#0f1a2c";
const BORDE = "#1e2d45";
const VERDE = "#34d399";
const AZUL = "#60a5fa";
const ROJO = "#fb7185";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function urgencia(dias: number): { texto: string; color: string } {
  if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)} d`, color: ROJO };
  if (dias === 0) return { texto: "Vence hoy", color: ROJO };
  if (dias === 1) return { texto: "Vence mañana", color: "#fbbf24" };
  return { texto: `En ${dias} días`, color: TINTA_SUAVE };
}

function fila(etiqueta: string, valor: string, color = TINTA): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDE};color:${TINTA_SUAVE};font-size:14px;">${etiqueta}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${BORDE};color:${color};font-size:15px;font-weight:600;">${valor}</td>
    </tr>`;
}

function bloqueRecordatorios(avisos: RecordatorioCalculado[]): string {
  if (avisos.length === 0) {
    return `
      <p style="margin:0 0 24px;color:${TINTA_SUAVE};font-size:14px;line-height:1.6;">
        No tienes pagos pendientes en los próximos días. Buen momento para adelantar el aporte al ahorro.
      </p>`;
  }

  const filas = avisos
    .map((r) => {
      const u = urgencia(r.diasFaltantes);
      const monto = r.montoEstimado > 0 ? pesos(r.montoEstimado) : "Sin monto definido";
      return `
        <tr>
          <td style="padding:14px 16px;background:${TARJETA};border:1px solid ${BORDE};border-radius:10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:${TINTA};font-size:15px;font-weight:600;">${escapar(r.titulo)}</td>
                <td align="right" style="color:${u.color};font-size:13px;font-weight:600;">${u.texto}</td>
              </tr>
              <tr>
                <td style="padding-top:4px;color:${TINTA_SUAVE};font-size:13px;">
                  ${escapar(fechaCorta(r.vencimiento))}${r.categoria ? ` · ${escapar(etiquetaCategoria(r.categoria))}` : ""}
                </td>
                <td align="right" style="padding-top:4px;color:${TINTA_SUAVE};font-size:13px;">${monto}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:10px;line-height:10px;">&nbsp;</td></tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>`;
}

function barraProgreso(progreso: number): string {
  const lleno = Math.max(2, Math.min(100, progreso));
  const vacio = 100 - lleno;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:999px;overflow:hidden;background:#16243a;">
      <tr>
        <td width="${lleno}%" style="height:10px;line-height:10px;background:${VERDE};background-image:linear-gradient(90deg,${VERDE},${AZUL});">&nbsp;</td>
        ${vacio > 0 ? `<td width="${vacio}%" style="height:10px;line-height:10px;">&nbsp;</td>` : ""}
      </tr>
    </table>`;
}

export interface CorreoDiario {
  asunto: string;
  html: string;
  texto: string;
}

export function construirCorreoDiario(
  resumen: Resumen,
  avisos: RecordatorioCalculado[],
  hoy: string,
  urlApp: string,
): CorreoDiario {
  const asunto =
    avisos.length > 0
      ? `Finanza · ${avisos.length} ${avisos.length === 1 ? "pago pendiente" : "pagos pendientes"} · ${fechaCorta(hoy)}`
      : `Finanza · tu resumen de ${nombreMes(resumen.mes)}`;

  const consejo = resumen.consejos[0] ?? "";
  const colorDisponible = resumen.disponible < 0 ? ROJO : VERDE;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapar(asunto)}</title>
</head>
<body style="margin:0;padding:0;background:${FONDO};color:${TINTA};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${avisos.length > 0 ? `${avisos.length} pagos por vencer. ` : ""}Disponible: ${pesos(resumen.disponible)}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding:24px;border-radius:16px 16px 0 0;background:${VERDE};background-image:linear-gradient(120deg,${VERDE} 0%,#22d3ee 55%,${AZUL} 100%);">
              <p style="margin:0;color:#04121c;font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Finanza</p>
              <p style="margin:6px 0 0;color:#04121c;font-size:20px;font-weight:700;">${escapar(fechaLarga(hoy))}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;background:#0b1424;border:1px solid ${BORDE};border-top:0;border-radius:0 0 16px 16px;">

              <p style="margin:0 0 14px;color:${TINTA};font-size:16px;font-weight:600;">
                ${avisos.length > 0 ? "Lo que se vence pronto" : "Todo al día"}
              </p>
              ${bloqueRecordatorios(avisos)}

              <p style="margin:26px 0 12px;color:${TINTA};font-size:16px;font-weight:600;">
                ${escapar(nombreMes(resumen.mes))} en números
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${fila("Ingreso", pesos(resumen.ingresoTotal))}
                ${fila("Gastado", pesos(resumen.gastado))}
                ${fila("Ahorrado este mes", pesos(resumen.ahorradoMes), VERDE)}
                ${fila("Disponible", pesos(resumen.disponible), colorDisponible)}
              </table>

              ${
                resumen.metaAhorro > 0
                  ? `
              <p style="margin:26px 0 10px;color:${TINTA};font-size:16px;font-weight:600;">${escapar(resumen.metaNombre)}</p>
              ${barraProgreso(resumen.progresoMeta)}
              <p style="margin:10px 0 0;color:${TINTA_SUAVE};font-size:13px;">
                ${pesos(resumen.ahorroTotal)} de ${pesos(resumen.metaAhorro)} · ${resumen.progresoMeta}%${
                  resumen.mesesRestantes !== null && resumen.mesesRestantes > 0
                    ? ` · faltan ~${resumen.mesesRestantes} ${resumen.mesesRestantes === 1 ? "mes" : "meses"}`
                    : ""
                }
              </p>`
                  : ""
              }

              ${
                consejo
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;">
                <tr>
                  <td style="padding:16px;background:${TARJETA};border-left:3px solid ${VERDE};border-radius:0 10px 10px 0;color:${TINTA_SUAVE};font-size:14px;line-height:1.6;">
                    ${escapar(consejo)}
                  </td>
                </tr>
              </table>`
                  : ""
              }

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center" style="border-radius:10px;background:${VERDE};background-image:linear-gradient(120deg,${VERDE},${AZUL});">
                    <a href="${escapar(urlApp)}" style="display:inline-block;padding:13px 28px;color:#04121c;font-size:15px;font-weight:700;text-decoration:none;">Abrir mi panel</a>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0;color:#5c6b83;font-size:12px;line-height:1.6;text-align:center;">
                Recibes este correo porque activaste el recordatorio diario en Finanza.<br>
                Puedes apagarlo cuando quieras desde Ajustes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const lineas = [
    `Finanza — ${fechaLarga(hoy)}`,
    "",
    avisos.length > 0 ? "Pagos por vencer:" : "Sin pagos pendientes en los próximos días.",
    ...avisos.map(
      (r) =>
        `- ${r.titulo} · ${fechaCorta(r.vencimiento)} · ${urgencia(r.diasFaltantes).texto}${
          r.montoEstimado > 0 ? ` · ${pesos(r.montoEstimado)}` : ""
        }`,
    ),
    "",
    `${nombreMes(resumen.mes)}:`,
    `- Ingreso: ${pesos(resumen.ingresoTotal)}`,
    `- Gastado: ${pesos(resumen.gastado)}`,
    `- Ahorrado este mes: ${pesos(resumen.ahorradoMes)}`,
    `- Disponible: ${pesos(resumen.disponible)}`,
    ...(resumen.metaAhorro > 0
      ? [
          "",
          `${resumen.metaNombre}: ${pesos(resumen.ahorroTotal)} de ${pesos(resumen.metaAhorro)} (${resumen.progresoMeta}%)`,
        ]
      : []),
    ...(consejo ? ["", consejo] : []),
    "",
    `Abrir el panel: ${urlApp}`,
  ];

  return { asunto, html, texto: lineas.join("\n") };
}

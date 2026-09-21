export const ZONA = process.env.TZ_APP || "America/Bogota";

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la app, no la del servidor. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Mes actual (YYYY-MM) en la zona horaria de la app. */
export function mesActual(): string {
  return hoyISO().slice(0, 7);
}

export function esMesValido(mes: unknown): mes is string {
  return typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function esFechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [a, m, d] = fecha.split("-").map(Number);
  const prueba = new Date(Date.UTC(a, m - 1, d));
  return (
    prueba.getUTCFullYear() === a &&
    prueba.getUTCMonth() === m - 1 &&
    prueba.getUTCDate() === d
  );
}

/** "2026-09" -> "septiembre 2026" */
export function nombreMes(mes: string): string {
  const [anio, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${anio}`;
}

/** "2026-09" -> "sep" */
export function mesCorto(mes: string): string {
  return MESES_CORTOS[Number(mes.split("-")[1]) - 1];
}

/** Desplaza un mes YYYY-MM en `delta` meses. */
export function sumarMeses(mes: string, delta: number): string {
  const [anio, m] = mes.split("-").map(Number);
  const total = anio * 12 + (m - 1) + delta;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = total % 12;
  return `${nuevoAnio}-${String(nuevoMes + 1).padStart(2, "0")}`;
}

export function diasDelMes(mes: string): number {
  const [anio, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, m, 0)).getUTCDate();
}

/** Diferencia en días completos entre dos fechas YYYY-MM-DD. */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Próximo vencimiento de un recordatorio mensual que cae el día `dia`.
 * Si el día ya pasó este mes, salta al siguiente. Los días que no existen en el
 * mes (31 en febrero) se ajustan al último día disponible.
 */
export function proximoVencimiento(dia: number, hoy = hoyISO()): string {
  const mes = hoy.slice(0, 7);
  const diaHoy = Number(hoy.slice(8, 10));
  const objetivo = diaHoy > dia ? sumarMeses(mes, 1) : mes;
  const diaAjustado = Math.min(dia, diasDelMes(objetivo));
  return `${objetivo}-${String(diaAjustado).padStart(2, "0")}`;
}

export function fechaLarga(fecha: string): string {
  const [anio, m, d] = fecha.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${anio}`;
}

export function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]}`;
}

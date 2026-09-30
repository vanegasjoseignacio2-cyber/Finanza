/**
 * Festivos de Colombia (Ley 51 de 1983, "Ley Emiliani"): los festivos que no
 * caen en lunes se trasladan al lunes siguiente, salvo los siete de fecha fija
 * que siempre son ese mismo día (1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic, y
 * el propio Viernes/Jueves Santo y Domingo de Pascua que dependen del calendario
 * litúrgico y no se trasladan).
 */

export interface Festivo {
  fecha: string; // YYYY-MM-DD
  nombre: string;
}

/** Domingo de Pascua de un año, algoritmo de Gauss (calendario gregoriano). */
function domingoDePascua(anio: number): { mes: number; dia: number } {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

function sumarDias(anio: number, mes: number, dia: number, delta: number): { anio: number; mes: number; dia: number } {
  const d = new Date(Date.UTC(anio, mes - 1, dia + delta));
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

function aISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Traslada una fecha fija al lunes siguiente si no cae en lunes (Ley Emiliani). */
function alLunesSiguiente(anio: number, mes: number, dia: number): string {
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(); // 0 domingo … 1 lunes
  if (diaSemana === 1) return aISO(anio, mes, dia);
  const desfase = diaSemana === 0 ? 1 : 8 - diaSemana;
  const trasladado = sumarDias(anio, mes, dia, desfase);
  return aISO(trasladado.anio, trasladado.mes, trasladado.dia);
}

/** Festivos de Colombia para un año, ordenados por fecha. */
export function festivosDelAnio(anio: number): Festivo[] {
  const pascua = domingoDePascua(anio);
  const desdePascua = (delta: number) => {
    const d = sumarDias(anio, pascua.mes, pascua.dia, delta);
    return aISO(d.anio, d.mes, d.dia);
  };
  // Ascensión, Corpus Christi y Sagrado Corazón caen en jueves (39, 60 y 68 días
  // después de Pascua) y también se trasladan al lunes siguiente.
  const desdePascuaAlLunes = (delta: number) => {
    const d = sumarDias(anio, pascua.mes, pascua.dia, delta);
    return alLunesSiguiente(d.anio, d.mes, d.dia);
  };

  const festivos: Festivo[] = [
    // Fecha fija, sin traslado.
    { fecha: aISO(anio, 1, 1), nombre: "Año Nuevo" },
    { fecha: desdePascua(-3), nombre: "Jueves Santo" },
    { fecha: desdePascua(-2), nombre: "Viernes Santo" },
    { fecha: aISO(anio, 5, 1), nombre: "Día del Trabajo" },
    { fecha: aISO(anio, 7, 20), nombre: "Grito de Independencia" },
    { fecha: aISO(anio, 8, 7), nombre: "Batalla de Boyacá" },
    { fecha: aISO(anio, 12, 8), nombre: "Inmaculada Concepción" },
    { fecha: aISO(anio, 12, 25), nombre: "Navidad" },
    // Se trasladan al lunes siguiente.
    { fecha: alLunesSiguiente(anio, 1, 6), nombre: "Día de los Reyes Magos" },
    { fecha: alLunesSiguiente(anio, 3, 19), nombre: "Día de San José" },
    { fecha: desdePascuaAlLunes(39), nombre: "Ascensión del Señor" },
    { fecha: desdePascuaAlLunes(60), nombre: "Corpus Christi" },
    { fecha: desdePascuaAlLunes(68), nombre: "Sagrado Corazón de Jesús" },
    { fecha: alLunesSiguiente(anio, 6, 29), nombre: "San Pedro y San Pablo" },
    { fecha: alLunesSiguiente(anio, 8, 15), nombre: "Asunción de la Virgen" },
    { fecha: alLunesSiguiente(anio, 10, 12), nombre: "Día de la Raza" },
    { fecha: alLunesSiguiente(anio, 11, 1), nombre: "Día de Todos los Santos" },
    { fecha: alLunesSiguiente(anio, 11, 11), nombre: "Independencia de Cartagena" },
  ];

  return festivos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

let cache: { anio: number; festivos: Festivo[] } | null = null;

/** Igual que festivosDelAnio, con memoria del último año pedido. */
function festivosCacheados(anio: number): Festivo[] {
  if (cache?.anio !== anio) cache = { anio, festivos: festivosDelAnio(anio) };
  return cache.festivos;
}

/** Festivo que cae en `fecha` (YYYY-MM-DD), si lo hay. */
export function festivoEn(fecha: string): Festivo | null {
  const anio = Number(fecha.slice(0, 4));
  return festivosCacheados(anio).find((f) => f.fecha === fecha) ?? null;
}

/** Festivos de un mes YYYY-MM. */
export function festivosDelMes(mes: string): Festivo[] {
  const anio = Number(mes.slice(0, 4));
  return festivosCacheados(anio).filter((f) => f.fecha.startsWith(mes));
}

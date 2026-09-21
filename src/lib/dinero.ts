const formateador = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const formateadorCorto = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

/** $ 1.423.500 */
export function pesos(valor: number): string {
  return formateador.format(Math.round(valor || 0));
}

/** 1.423.500 (sin símbolo, para tablas y campos) */
export function numero(valor: number): string {
  return formateadorCorto.format(Math.round(valor || 0));
}

/** 1.4 M — para ejes y etiquetas donde no cabe la cifra completa. */
export function pesosCompacto(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) {
    const millones = valor / 1_000_000;
    return `$${millones.toFixed(millones >= 10 ? 0 : 1).replace(".", ",")}M`;
  }
  if (abs >= 1_000) return `$${Math.round(valor / 1_000)}k`;
  return `$${Math.round(valor)}`;
}

export function porcentaje(parte: number, total: number): number {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

/**
 * Redondea hacia arriba al siguiente número "redondo" (1, 2, 2,5 o 5 por
 * potencia de diez) para que el eje del gráfico no muestre cifras como $678k.
 */
export function techoBonito(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 1;
  const magnitud = 10 ** Math.floor(Math.log10(valor));
  const escalado = valor / magnitud;
  const paso = escalado <= 1 ? 1 : escalado <= 2 ? 2 : escalado <= 2.5 ? 2.5 : escalado <= 5 ? 5 : 10;
  return paso * magnitud;
}

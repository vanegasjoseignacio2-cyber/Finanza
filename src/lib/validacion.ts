import { esCategoriaValida } from "./categorias";
import { esFechaValida } from "./fechas";
import type { TipoMovimiento } from "./types";

export class ErrorValidacion extends Error {}

export function comoTexto(valor: unknown, campo: string, max = 120, obligatorio = true): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (obligatorio && texto.length === 0) {
    throw new ErrorValidacion(`El campo ${campo} es obligatorio.`);
  }
  if (texto.length > max) {
    throw new ErrorValidacion(`El campo ${campo} no puede superar ${max} caracteres.`);
  }
  return texto;
}

export function comoMonto(valor: unknown, campo = "monto", permitirCero = false): number {
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new ErrorValidacion(`El ${campo} debe ser un número positivo.`);
  }
  if (!permitirCero && numero === 0) {
    throw new ErrorValidacion(`El ${campo} debe ser mayor que cero.`);
  }
  if (numero > 1e12) {
    throw new ErrorValidacion(`El ${campo} es demasiado grande.`);
  }
  return Math.round(numero);
}

export function comoDia(valor: unknown): number {
  const dia = Number(valor);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new ErrorValidacion("El día debe estar entre 1 y 31.");
  }
  return dia;
}

export function comoTipo(valor: unknown): TipoMovimiento {
  if (valor === "gasto" || valor === "ahorro" || valor === "ingreso") return valor;
  throw new ErrorValidacion("Tipo de movimiento inválido.");
}

export function comoFecha(valor: unknown): string {
  if (!esFechaValida(valor)) {
    throw new ErrorValidacion("La fecha no es válida (formato AAAA-MM-DD).");
  }
  return valor;
}

export function comoCategoria(valor: unknown, tipo: TipoMovimiento): string {
  if (tipo === "ahorro") return "ahorro";
  if (tipo === "ingreso") return "ingreso-extra";
  if (!esCategoriaValida(valor)) {
    throw new ErrorValidacion("Selecciona una categoría válida.");
  }
  return valor;
}

export function comoEmail(valor: unknown, obligatorio = false): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto) {
    if (obligatorio) throw new ErrorValidacion("El correo es obligatorio.");
    return "";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto) || texto.length > 200) {
    throw new ErrorValidacion("El correo no tiene un formato válido.");
  }
  return texto;
}

export function comoBooleano(valor: unknown, porDefecto = false): boolean {
  if (typeof valor === "boolean") return valor;
  if (valor === "true") return true;
  if (valor === "false") return false;
  return porDefecto;
}

export async function leerJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const cuerpo = await request.json();
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
      throw new ErrorValidacion("El cuerpo de la petición debe ser un objeto JSON.");
    }
    return cuerpo as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ErrorValidacion) throw error;
    throw new ErrorValidacion("No se pudo leer el cuerpo de la petición.");
  }
}

/** Convierte cualquier error en una respuesta JSON consistente. */
export function respuestaError(error: unknown): Response {
  if (error instanceof ErrorValidacion) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("Error no controlado en la API:", error);
  const mensaje =
    error instanceof Error && process.env.NODE_ENV !== "production"
      ? error.message
      : "Algo falló en el servidor. Intenta de nuevo.";
  return Response.json({ error: mensaje }, { status: 500 });
}

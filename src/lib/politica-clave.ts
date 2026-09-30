/**
 * Política de claves. Módulo puro: lo usa el formulario (para mostrar qué falta
 * mientras se escribe) y el servidor (que es quien de verdad decide).
 */

export const LARGO_MINIMO_CLAVE = 12;
export const LARGO_MAXIMO_CLAVE = 128;

// Fragmentos que vuelven débil cualquier clave que los contenga.
const COMUNES = [
  "password",
  "contrasena",
  "contraseña",
  "123456",
  "12345678",
  "qwerty",
  "abc123",
  "admin",
  "letmein",
  "finanza",
  "colombia",
  "iloveyou",
  "welcome",
];

export interface Requisito {
  id: string;
  texto: string;
  cumple: boolean;
}

export interface ContextoClave {
  /** Correo del usuario: la clave no puede contenerlo. */
  correo?: string;
  /** Clave actual: la nueva debe ser distinta. */
  actual?: string;
}

function contieneCorreo(clave: string, correo?: string): boolean {
  const usuario = correo?.split("@")[0]?.toLowerCase() ?? "";
  return usuario.length >= 3 && clave.toLowerCase().includes(usuario);
}

export function evaluarClave(clave: string, { correo, actual }: ContextoClave = {}): Requisito[] {
  const minuscula = clave.toLowerCase();
  const requisitos: Requisito[] = [
    {
      id: "largo",
      texto: `Entre ${LARGO_MINIMO_CLAVE} y ${LARGO_MAXIMO_CLAVE} caracteres`,
      cumple: clave.length >= LARGO_MINIMO_CLAVE && clave.length <= LARGO_MAXIMO_CLAVE,
    },
    { id: "mayuscula", texto: "Una letra mayúscula", cumple: /\p{Lu}/u.test(clave) },
    { id: "minuscula", texto: "Una letra minúscula", cumple: /\p{Ll}/u.test(clave) },
    { id: "numero", texto: "Un número", cumple: /\d/.test(clave) },
    { id: "simbolo", texto: "Un símbolo (por ejemplo ! ? # $ %)", cumple: /[^\p{L}\p{N}\s]/u.test(clave) },
    {
      id: "espacios",
      texto: "Sin espacios al inicio ni al final",
      cumple: clave.length > 0 && clave === clave.trim(),
    },
    {
      id: "repetidos",
      texto: "Sin el mismo carácter 3 veces seguidas",
      cumple: clave.length > 0 && !/(.)\1\1/u.test(clave),
    },
    {
      id: "comun",
      texto: "Sin palabras comunes ni tu correo",
      cumple:
        clave.length > 0 && !COMUNES.some((c) => minuscula.includes(c)) && !contieneCorreo(clave, correo),
    },
  ];
  if (actual !== undefined) {
    requisitos.push({
      id: "distinta",
      texto: "Distinta de la clave actual",
      cumple: clave.length > 0 && clave !== actual,
    });
  }
  return requisitos;
}

/** Mensaje del primer requisito incumplido, o null si la clave es válida. */
export function errorClave(clave: string, contexto: ContextoClave = {}): string | null {
  const fallo = evaluarClave(clave, contexto).find((r) => !r.cumple);
  return fallo ? `La clave nueva no cumple el requisito: ${fallo.texto}.` : null;
}

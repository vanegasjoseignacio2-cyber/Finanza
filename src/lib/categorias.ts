/**
 * Catálogo de categorías. Los iconos se resuelven en `componentes/iconos.ts`
 * (cliente) para que este módulo siga siendo usable desde el servidor y el cron.
 */
export interface Categoria {
  id: string;
  label: string;
  icono: string;
  tipo: "gasto" | "ahorro" | "ingreso";
}

export const CATEGORIAS: Categoria[] = [
  { id: "arriendo", label: "Arriendo", icono: "Home", tipo: "gasto" },
  { id: "mercado", label: "Mercado", icono: "ShoppingCart", tipo: "gasto" },
  { id: "gasolina", label: "Gasolina", icono: "Fuel", tipo: "gasto" },
  { id: "moto", label: "Moto", icono: "Bike", tipo: "gasto" },
  { id: "transporte", label: "Transporte", icono: "Bus", tipo: "gasto" },
  { id: "celular", label: "Plan celular", icono: "Smartphone", tipo: "gasto" },
  { id: "servicios", label: "Servicios", icono: "Zap", tipo: "gasto" },
  { id: "almuerzo", label: "Comida fuera", icono: "UtensilsCrossed", tipo: "gasto" },
  { id: "salud", label: "Salud", icono: "HeartPulse", tipo: "gasto" },
  { id: "educacion", label: "Educación", icono: "GraduationCap", tipo: "gasto" },
  { id: "ocio", label: "Ocio", icono: "Clapperboard", tipo: "gasto" },
  { id: "suscripciones", label: "Suscripciones", icono: "Repeat", tipo: "gasto" },
  { id: "regalos", label: "Regalos", icono: "Gift", tipo: "gasto" },
  { id: "otros", label: "Otros", icono: "Package", tipo: "gasto" },
  { id: "ahorro", label: "Aporte a ahorro", icono: "PiggyBank", tipo: "ahorro" },
  { id: "ingreso-extra", label: "Ingreso extra", icono: "Wallet", tipo: "ingreso" },
];

export const CATEGORIAS_GASTO = CATEGORIAS.filter((c) => c.tipo === "gasto");

const porId = new Map(CATEGORIAS.map((c) => [c.id, c]));

export function categoria(id: string): Categoria {
  return (
    porId.get(id) ?? { id, label: id, icono: "Package", tipo: "gasto" }
  );
}

export function etiquetaCategoria(id: string): string {
  return categoria(id).label;
}

export function esCategoriaValida(id: unknown): id is string {
  return typeof id === "string" && porId.has(id);
}

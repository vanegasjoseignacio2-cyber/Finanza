import type { CategoriaPersonal } from "./types";

/**
 * Catálogo de categorías. Las base vienen de fábrica; las personales se guardan
 * en la base y se mezclan con `crearCatalogo`. Los iconos se resuelven en
 * `components/iconos.tsx` (cliente) para que este módulo siga siendo usable desde
 * el servidor y el cron.
 */
export interface Categoria {
  id: string;
  label: string;
  icono: string;
  tipo: "gasto" | "ingreso" | "ahorro" | "retiro" | "transferencia";
  personal?: boolean;
  oculta?: boolean;
}

export const CATEGORIAS_BASE: Categoria[] = [
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
  { id: "sueldo", label: "Sueldo", icono: "Briefcase", tipo: "ingreso" },
  { id: "ingreso-extra", label: "Ingreso extra", icono: "Wallet", tipo: "ingreso" },
  { id: "ahorro", label: "Aporte a meta", icono: "PiggyBank", tipo: "ahorro" },
  { id: "retiro", label: "Retiro de meta", icono: "ArrowDownToLine", tipo: "retiro" },
  { id: "transferencia", label: "Transferencia", icono: "ArrowLeftRight", tipo: "transferencia" },
];

/** Iconos que se pueden elegir para una categoría personal. */
export const ICONOS_DISPONIBLES = [
  "Package", "ShoppingBag", "Coffee", "Beer", "Pizza", "Shirt", "Scissors",
  "Dumbbell", "PawPrint", "Baby", "Car", "Plane", "Bus", "Home", "Wrench",
  "Laptop", "Gamepad2", "Music", "BookOpen", "Stethoscope", "Pill", "Gift",
  "HandCoins", "Landmark", "Briefcase", "Wallet", "Heart", "Sparkles",
] as const;

export interface Catalogo {
  lista: Categoria[];
  gasto: Categoria[];
  ingreso: Categoria[];
  obtener: (id: string) => Categoria;
  etiqueta: (id: string) => string;
  existe: (id: string, tipo?: Categoria["tipo"]) => boolean;
}

export function crearCatalogo(personales: CategoriaPersonal[] = []): Catalogo {
  // Una categoría personal con el id de una base la ajusta (nombre, icono,
  // oculta) sin poder cambiarle el tipo; con un id nuevo, la agrega.
  const porId = new Map<string, Categoria>(CATEGORIAS_BASE.map((c) => [c.id, c]));
  for (const p of personales) {
    const base = porId.get(p.id);
    porId.set(
      p.id,
      base
        ? { ...base, label: p.label || base.label, icono: p.icono || base.icono, oculta: p.oculta }
        : { ...p, personal: true },
    );
  }
  const lista = [...porId.values()];
  const obtener = (id: string): Categoria =>
    porId.get(id) ?? { id, label: id, icono: "Package", tipo: "gasto" };
  return {
    lista,
    gasto: lista.filter((c) => c.tipo === "gasto" && !c.oculta),
    ingreso: lista.filter((c) => c.tipo === "ingreso" && !c.oculta),
    obtener,
    etiqueta: (id) => obtener(id).label,
    existe: (id, tipo) => {
      const c = porId.get(id);
      return Boolean(c && (!tipo || c.tipo === tipo));
    },
  };
}

/** Catálogo sin categorías personales: útil en pruebas y como respaldo. */
export const CATALOGO_BASE = crearCatalogo();

/** Convierte un nombre en un identificador estable: "Café & pan" -> "cafe-pan". */
export function slugCategoria(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

"use client";

import {
  Bike,
  Bus,
  Clapperboard,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Package,
  PiggyBank,
  Repeat,
  ShoppingCart,
  Smartphone,
  UtensilsCrossed,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { categoria } from "@/lib/categorias";

const MAPA: Record<string, LucideIcon> = {
  Home,
  ShoppingCart,
  Fuel,
  Bike,
  Bus,
  Smartphone,
  Zap,
  UtensilsCrossed,
  HeartPulse,
  GraduationCap,
  Clapperboard,
  Repeat,
  Gift,
  Package,
  PiggyBank,
  Wallet,
};

export function IconoCategoria({
  id,
  className = "size-4",
}: {
  id: string;
  className?: string;
}) {
  const Icono = MAPA[categoria(id).icono] ?? Package;
  return <Icono className={className} aria-hidden="true" />;
}

"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { crearCatalogo, type Catalogo } from "@/lib/categorias";
import type { CategoriaPersonal, Cuenta, Meta, RecordatorioCalculado } from "@/lib/types";

/**
 * Datos pequeños que casi todas las pantallas necesitan (categorías, cuentas,
 * metas, pagos pendientes). Los carga el layout en el servidor; tras cada
 * cambio, `router.refresh()` los vuelve a traer.
 */
export interface DatosPanel {
  hoy: string;
  personales: CategoriaPersonal[];
  cuentas: Cuenta[];
  metas: Meta[];
  pendientes: RecordatorioCalculado[];
}

const Contexto = createContext<(DatosPanel & { catalogo: Catalogo }) | null>(null);

export function ProveedorDatos({ datos, children }: { datos: DatosPanel; children: ReactNode }) {
  const catalogo = useMemo(() => crearCatalogo(datos.personales), [datos.personales]);
  const valor = useMemo(() => ({ ...datos, catalogo }), [datos, catalogo]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatos() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useDatos debe usarse dentro de <ProveedorDatos>.");
  return valor;
}

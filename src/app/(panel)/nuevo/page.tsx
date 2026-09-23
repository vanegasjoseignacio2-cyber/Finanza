import type { TipoMovimiento } from "@/lib/types";
import { PantallaCaptura } from "./pantalla";

export const metadata = { title: "Nuevo movimiento" };

const TIPOS: TipoMovimiento[] = ["gasto", "ingreso", "ahorro", "retiro", "transferencia"];

/** Captura a pantalla completa: destino de los accesos directos del ícono instalado. */
export default async function PaginaNuevo({ searchParams }: PageProps<"/nuevo">) {
  const { tipo } = await searchParams;
  const elegido = TIPOS.find((t) => t === tipo);
  return <PantallaCaptura tipo={elegido} />;
}

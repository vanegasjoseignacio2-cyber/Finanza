import { listarMovimientos } from "@/lib/datos";
import { mesActual } from "@/lib/fechas";
import { VistaMovimientos } from "./vista";

export const metadata = { title: "Movimientos" };
export const dynamic = "force-dynamic";

export default async function PaginaMovimientos() {
  const mes = mesActual();
  const movimientos = await listarMovimientos({ mes });
  return <VistaMovimientos inicial={movimientos} mesInicial={mes} />;
}

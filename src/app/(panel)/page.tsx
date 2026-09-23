import { calcularResumen } from "@/lib/datos";
import { VistaHoy } from "./vista-hoy";

export const dynamic = "force-dynamic";

export default async function PaginaHoy() {
  return <VistaHoy resumen={await calcularResumen()} />;
}

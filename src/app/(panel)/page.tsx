import { acreditarSueldoSiToca, calcularResumen } from "@/lib/datos";
import { VistaHoy } from "./vista-hoy";

export const dynamic = "force-dynamic";

export default async function PaginaHoy() {
  // Si hoy (o antes) era el día del sueldo y aún no se registra, se registra ahora.
  await acreditarSueldoSiToca().catch(() => undefined);
  return <VistaHoy resumen={await calcularResumen()} />;
}

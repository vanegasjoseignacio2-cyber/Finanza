import { calcularResumen, listarGastosAgendados, listarPortadas } from "@/lib/datos";
import { esMesValido, mesActual } from "@/lib/fechas";
import { VistaCalendario } from "./vista";

export const metadata = { title: "Calendario" };
export const dynamic = "force-dynamic";

export default async function PaginaCalendario({ searchParams }: PageProps<"/calendario">) {
  const { mes } = await searchParams;
  const elegido = typeof mes === "string" && esMesValido(mes) ? mes : mesActual();
  const [resumen, portadas, gastos] = await Promise.all([
    calcularResumen(elegido),
    listarPortadas(),
    listarGastosAgendados(),
  ]);
  return <VistaCalendario resumen={resumen} portadas={portadas} gastos={gastos} />;
}

import { calcularInformeGastos } from "@/lib/datos";
import { esMesValido, mesActual } from "@/lib/fechas";
import { esPeriodoInforme } from "@/lib/informe";
import { VistaInforme } from "./vista";

export const metadata = { title: "Informe" };
export const dynamic = "force-dynamic";

export default async function PaginaInforme({ searchParams }: PageProps<"/informe">) {
  const { mes, periodo } = await searchParams;
  const hasta = typeof mes === "string" && esMesValido(mes) ? mes : mesActual();
  const elegido = esPeriodoInforme(periodo) ? periodo : "mes";
  return <VistaInforme informe={await calcularInformeGastos(elegido, hasta)} periodo={elegido} mes={hasta} />;
}

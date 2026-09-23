import { calcularResumen } from "@/lib/datos";
import { esMesValido, mesActual } from "@/lib/fechas";
import { VistaPresupuesto } from "./vista";

export const metadata = { title: "Presupuesto" };
export const dynamic = "force-dynamic";

export default async function PaginaPresupuesto({ searchParams }: PageProps<"/presupuesto">) {
  const { mes } = await searchParams;
  const elegido = typeof mes === "string" && esMesValido(mes) ? mes : mesActual();
  return <VistaPresupuesto resumen={await calcularResumen(elegido)} />;
}

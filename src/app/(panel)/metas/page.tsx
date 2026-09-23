import { calcularResumen, listarMetas } from "@/lib/datos";
import { VistaMetas } from "./vista";

export const metadata = { title: "Metas" };
export const dynamic = "force-dynamic";

export default async function PaginaMetas() {
  const [resumen, todas] = await Promise.all([calcularResumen(), listarMetas()]);
  return <VistaMetas resumen={resumen} archivadas={todas.filter((m) => m.archivada)} />;
}

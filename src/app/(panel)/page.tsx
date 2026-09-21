import { calcularResumen } from "@/lib/datos";
import { Panel } from "./panel";

export const dynamic = "force-dynamic";

export default async function PaginaPanel() {
  const resumen = await calcularResumen();
  return <Panel inicial={resumen} />;
}

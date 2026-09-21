import { obtenerAjustes } from "@/lib/datos";
import { diagnosticoCorreo } from "@/lib/email/estado";
import { VistaAjustes } from "./vista";

export const metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function PaginaAjustes() {
  return <VistaAjustes inicial={await obtenerAjustes()} diagnostico={diagnosticoCorreo()} />;
}

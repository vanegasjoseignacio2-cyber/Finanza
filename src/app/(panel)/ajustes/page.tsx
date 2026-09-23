import { listarCuentas, listarEnvios, obtenerAjustes, obtenerCatalogo, sumasHistoricas } from "@/lib/datos";
import { diagnosticoCorreo } from "@/lib/email/estado";
import { calcularSaldos } from "@/lib/finanzas";
import { VistaAjustes } from "./vista";

export const metadata = { title: "Ajustes" };
export const dynamic = "force-dynamic";

export default async function PaginaAjustes() {
  const [ajustes, cuentas, sumas, catalogo, envios] = await Promise.all([
    obtenerAjustes(),
    listarCuentas(),
    sumasHistoricas(),
    obtenerCatalogo(),
    listarEnvios(10),
  ]);
  return (
    <VistaAjustes
      ajustes={ajustes}
      cuentas={calcularSaldos(cuentas, sumas)}
      categorias={catalogo.lista.filter((c) => c.tipo === "gasto" || c.tipo === "ingreso")}
      envios={envios}
      diagnostico={diagnosticoCorreo()}
    />
  );
}

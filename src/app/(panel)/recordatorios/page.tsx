import { listarMovimientos, listarRecordatorios, obtenerAjustes } from "@/lib/datos";
import { calcularRecordatorios } from "@/lib/finanzas";
import { hoyISO, mesActual } from "@/lib/fechas";
import { VistaRecordatorios } from "./vista";

export const metadata = { title: "Recordatorios" };
export const dynamic = "force-dynamic";

export default async function PaginaRecordatorios() {
  const [recordatorios, movimientos, ajustes] = await Promise.all([
    listarRecordatorios(),
    listarMovimientos({ mes: mesActual() }),
    obtenerAjustes(),
  ]);

  return (
    <VistaRecordatorios
      inicial={calcularRecordatorios(recordatorios, movimientos, hoyISO())}
      ajustes={ajustes}
    />
  );
}

import { listarCuentas, listarMovimientos, sumasHistoricas } from "@/lib/datos";
import { esMesValido, mesActual } from "@/lib/fechas";
import { calcularSaldos } from "@/lib/finanzas";
import type { TipoMovimiento } from "@/lib/types";
import { VistaMovimientos } from "./vista";

export const metadata = { title: "Movimientos" };
export const dynamic = "force-dynamic";

const TIPOS = new Set(["gasto", "ingreso", "ahorro", "retiro", "transferencia"]);

export default async function PaginaMovimientos({ searchParams }: PageProps<"/movimientos">) {
  const p = await searchParams;
  const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const filtros = {
    mes: esMesValido(texto(p.mes)) ? texto(p.mes) : mesActual(),
    tipo: TIPOS.has(texto(p.tipo)) ? (texto(p.tipo) as TipoMovimiento) : undefined,
    categoria: texto(p.categoria) || undefined,
    cuentaId: texto(p.cuenta) || undefined,
    q: texto(p.q).trim().slice(0, 60) || undefined,
  };

  const [movimientos, cuentas, sumas] = await Promise.all([
    listarMovimientos(filtros),
    listarCuentas(),
    sumasHistoricas(),
  ]);

  return (
    <VistaMovimientos
      movimientos={movimientos}
      saldos={calcularSaldos(cuentas, sumas).filter((c) => !c.archivada)}
      filtros={{
        mes: filtros.mes,
        tipo: filtros.tipo ?? "",
        categoria: filtros.categoria ?? "",
        cuenta: filtros.cuentaId ?? "",
        q: filtros.q ?? "",
      }}
    />
  );
}

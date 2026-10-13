"use client";

import { CreditCard } from "lucide-react";
import { useCaptura } from "@/components/captura";
import { Regresiva, textoFalta } from "@/components/paneles/pagos-fijos";
import { Boton } from "@/components/ui/boton";
import { pesos } from "@/lib/dinero";
import { fechaCorta } from "@/lib/fechas";
import type { CuentaConSaldo, PagoTarjeta } from "@/lib/types";

/**
 * Cuándo toca pagar cada tarjeta de crédito y cuánto, con la misma cuenta regresiva
 * de los pagos fijos. Pagar la tarjeta es transferir desde el banco hacia ella.
 */
export function ListaPagosTarjeta({ pagos, cuentas }: { pagos: PagoTarjeta[]; cuentas: CuentaConSaldo[] }) {
  const captura = useCaptura();
  const origen = cuentas.find((c) => c.tipo !== "tarjeta" && !c.archivada)?.id;

  if (pagos.length === 0) return null;

  return (
    <ul className="flex flex-col">
      {pagos.map((p) => (
        <li key={p.cuentaId} className="border-b border-borde-suave py-3 last:border-b-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Regresiva r={{ diasFaltantes: p.diasFaltantes, pagado: false }} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[14.5px] text-tinta">
                <CreditCard className="size-4 shrink-0 text-tinta-3" aria-hidden="true" />
                <span className="truncate">Tarjeta {p.nombre}</span>
              </p>
              <p className="text-[12.5px] text-tinta-3">
                {p.pagada && <span className="text-verde">Este mes ya la pagaste · el próximo pago · </span>}
                <span className={p.diasFaltantes <= 3 ? "text-aviso" : "text-tinta-2"}>{textoFalta(p.diasFaltantes)} · </span>
                {fechaCorta(p.fecha)}
                {p.monto > 0 ? ` · ${pesos(p.monto)}` : " · nada por pagar"}
              </p>
            </div>
            {!p.pagada && p.monto > 0 && origen ? (
              <Boton
                tamano="sm"
                variante="secundario"
                className="shrink-0"
                onClick={() =>
                  captura.abrir({
                    tipo: "transferencia",
                    monto: p.monto,
                    cuentaId: origen,
                    cuentaDestinoId: p.cuentaId,
                    nota: "Pago de la tarjeta",
                  })
                }
              >
                Pagar
              </Boton>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

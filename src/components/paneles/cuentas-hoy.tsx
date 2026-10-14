"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Tarjeta } from "@/components/ui/tarjeta";
import { pesos } from "@/lib/dinero";
import type { CuentaConSaldo } from "@/lib/types";

const ETIQUETA_TIPO = { corriente: "Banco", efectivo: "Efectivo", ahorro: "Ahorro", tarjeta: "Tarjeta de crédito" } as const;

/** Dónde está la plata hoy: el saldo de cada cuenta y lo que suman juntas. */
export function CuentasHoy({ cuentas, className = "" }: { cuentas: CuentaConSaldo[]; className?: string }) {
  const propias = cuentas.filter((c) => c.tipo !== "tarjeta");
  const tarjetas = cuentas.filter((c) => c.tipo === "tarjeta");
  const total = propias.reduce((s, c) => s + c.saldo, 0);
  const deuda = tarjetas.reduce((s, c) => s + Math.max(0, -c.saldo), 0);

  return (
    <Tarjeta
      titulo="Mis cuentas"
      className={className}
      retraso={0.05}
      accion={
        <Link
          href="/ajustes#cuentas"
          className="area-toque -my-3 flex items-center gap-1 py-3 text-[12.5px] text-tinta-3 transition-colors hover:text-tinta"
        >
          Administrar
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      }
    >
      <p className="text-[12px] text-tinta-3">Total en tus cuentas</p>
      <p className={`mt-0.5 font-display text-[26px] leading-tight font-semibold tabular ${total < 0 ? "text-alerta" : "text-tinta"}`}>
        {total < 0 ? "− " : ""}
        {pesos(Math.abs(total))}
      </p>
      <ul className="mt-3 flex flex-col">
        {propias.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 border-t border-borde-suave py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[14.5px] text-tinta">{c.nombre}</p>
              <p className="text-[12.5px] text-tinta-3">{ETIQUETA_TIPO[c.tipo]}</p>
            </div>
            <span className={`shrink-0 text-[14.5px] font-semibold tabular ${c.saldo < 0 ? "text-alerta" : "text-tinta"}`}>
              {c.saldo < 0 ? "− " : ""}
              {pesos(Math.abs(c.saldo))}
            </span>
          </li>
        ))}
      </ul>
      {tarjetas.length > 0 && (
        <p className="flex items-center justify-between gap-3 border-t border-borde-suave pt-2.5 text-[13px] text-tinta-3">
          <span>Deuda en tarjetas de crédito</span>
          <span className="tabular text-tinta-2">{pesos(deuda)}</span>
        </p>
      )}
    </Tarjeta>
  );
}

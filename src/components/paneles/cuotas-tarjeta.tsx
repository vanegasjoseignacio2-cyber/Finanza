"use client";

import { CreditCard, Plus } from "lucide-react";
import { useState } from "react";
import { useCaptura } from "@/components/captura";
import { useDatos } from "@/components/datos-panel";
import { FormularioCuenta } from "@/components/paneles/formulario-cuenta";
import { Boton } from "@/components/ui/boton";
import { Modal } from "@/components/ui/modal";
import { Tarjeta } from "@/components/ui/tarjeta";
import { pesos } from "@/lib/dinero";
import { fechaCorta, nombreMes } from "@/lib/fechas";
import type { Movimiento, Resumen } from "@/lib/types";

/**
 * Las tarjetas de crédito en Hoy: botón para agregar una, lo que debes y tienes
 * disponible en cada una, las cuotas que toca pagar este mes (con su fecha y un
 * botón para pagarla) y lo que viene en los meses siguientes. Las cuotas de este
 * mes ya están descontadas de lo libre.
 */
export function CuotasTarjeta({ r }: { r: Resumen }) {
  const captura = useCaptura();
  const { catalogo } = useDatos();
  const [creando, setCreando] = useState(false);

  const tarjetas = r.cuentas.filter((c) => c.tipo === "tarjeta" && !c.archivada);
  const cuotas = r.movimientos
    .filter((m) => m.tipo === "gasto" && m.cuota !== null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const porTarjeta = new Map<string, Movimiento[]>();
  for (const m of cuotas) porTarjeta.set(m.cuentaId, [...(porTarjeta.get(m.cuentaId) ?? []), m]);
  const origen = r.cuentas.find((c) => c.tipo !== "tarjeta" && !c.archivada)?.id;

  return (
    <Tarjeta
      titulo="Tarjetas de crédito"
      retraso={0.08}
      accion={
        <Boton tamano="sm" variante="secundario" onClick={() => setCreando(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Agregar tarjeta de crédito
        </Boton>
      }
    >
      {tarjetas.length === 0 ? (
        <p className="text-[13.5px] leading-relaxed text-tinta-3">
          ¿Pagas con tarjeta de crédito? Agrégala y registra tus compras en cuotas: verás cuánto pagas cada mes y se
          descuenta de tu sueldo (de lo libre).
        </p>
      ) : (
        <ul className="flex flex-col">
          {tarjetas.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 border-b border-borde-suave py-2.5 first:pt-0 last:border-b-0">
              <span className="flex min-w-0 items-center gap-2">
                <CreditCard className="size-4 shrink-0 text-tinta-3" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] text-tinta">{t.nombre}</span>
                  <span className="block text-[12.5px] text-tinta-3">
                    {t.diaPago ? `La pagas el día ${t.diaPago}` : "Sin día de pago"}
                    {t.cupo ? ` · disponible ${pesos(Math.max(0, t.cupo + t.saldo))}` : ""}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-[14.5px] font-semibold tabular text-tinta">
                {t.saldo < 0 ? `Debes ${pesos(-t.saldo)}` : pesos(t.saldo)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {[...porTarjeta.entries()].map(([cuentaId, lista]) => {
        const tarjeta = r.cuentas.find((c) => c.id === cuentaId);
        const total = lista.reduce((s, m) => s + m.monto, 0);
        return (
          <div key={cuentaId} className="mt-4 border-t border-borde-suave pt-3">
            <p className="text-[12px] font-semibold tracking-[0.1em] text-tinta-3 uppercase">
              Cuotas de este mes · {tarjeta?.nombre ?? "Tarjeta"}
            </p>
            <ul className="mt-2 flex flex-col">
              {lista.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 border-b border-borde-suave py-2 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] text-tinta">{m.nota || catalogo.etiqueta(m.categoria)}</span>
                    <span className="block text-[12.5px] text-tinta-3">
                      Cuota {m.cuota} de {m.cuotas} · {fechaCorta(m.fecha)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[14px] font-semibold tabular text-tinta">{pesos(m.monto)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-tinta-2">
                Este mes pagas <span className="font-semibold text-tinta">{pesos(total)}</span>. Ya está descontado de lo
                libre: sale de tu sueldo de este mes.
              </p>
              <Boton
                tamano="sm"
                variante="secundario"
                onClick={() =>
                  captura.abrir({
                    tipo: "transferencia",
                    monto: total,
                    cuentaId: origen,
                    cuentaDestinoId: cuentaId,
                    nota: "Pago de la tarjeta",
                  })
                }
              >
                Pagar la tarjeta
              </Boton>
            </div>
          </div>
        );
      })}

      {tarjetas.length > 0 && cuotas.length === 0 && (
        <p className="mt-3 text-[13px] text-tinta-3">Este mes no tienes cuotas de tarjeta por pagar.</p>
      )}

      {r.cuotasProximas.length > 0 && (
        <div className="mt-4 border-t border-borde-suave pt-3">
          <p className="text-[12px] font-semibold tracking-[0.1em] text-tinta-3 uppercase">Próximos meses</p>
          <ul className="mt-2 flex flex-col gap-1">
            {r.cuotasProximas.slice(0, 6).map((p) => (
              <li key={p.mes} className="flex items-center justify-between gap-3 text-[13.5px]">
                <span className="text-tinta-2">
                  {nombreMes(p.mes)}
                  <span className="text-tinta-3">
                    {" "}
                    · {p.cantidad} {p.cantidad === 1 ? "cuota" : "cuotas"}
                  </span>
                </span>
                <span className="tabular text-tinta">{pesos(p.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal abierto={creando} onCerrar={() => setCreando(false)} titulo="Nueva tarjeta de crédito">
        {creando && <FormularioCuenta cuenta={null} tipoInicial="tarjeta" onListo={() => setCreando(false)} />}
      </Modal>
    </Tarjeta>
  );
}

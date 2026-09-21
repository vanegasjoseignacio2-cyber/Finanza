"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Lightbulb,
  PiggyBank,
  Plus,
  Receipt,
  TrendingDown,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AnilloMeta } from "@/components/graficos/anillo-meta";
import { BarrasCategorias } from "@/components/graficos/barras-categorias";
import { TendenciaMensual } from "@/components/graficos/tendencia-mensual";
import { ListaMovimientos } from "@/components/paneles/lista-movimientos";
import { ListaRecordatorios } from "@/components/paneles/lista-recordatorios";
import { ModalMovimiento } from "@/components/paneles/modal-movimiento";
import { TarjetaKPI } from "@/components/paneles/tarjeta-kpi";
import { SelectorMes } from "@/components/selector-mes";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { useAvisos } from "@/components/ui/avisos";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import { fechaLarga, mesActual } from "@/lib/fechas";
import type { Resumen, TipoMovimiento } from "@/lib/types";

export function Panel({ inicial }: { inicial: Resumen }) {
  const avisos = useAvisos();
  const [resumen, setResumen] = useState(inicial);
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState<TipoMovimiento | null>(null);

  const cargar = useCallback(
    async (mes: string) => {
      setCargando(true);
      try {
        setResumen(await peticion<Resumen>(`/api/resumen?mes=${mes}`));
      } catch (e) {
        avisos.error(e instanceof Error ? e.message : "No pudimos cargar el mes.");
      } finally {
        setCargando(false);
      }
    },
    [avisos],
  );

  const refrescar = useCallback(() => cargar(resumen.mes), [cargar, resumen.mes]);

  async function eliminarMovimiento(id: string) {
    try {
      await peticion(`/api/movimientos/${id}`, { method: "DELETE" });
      avisos.exito("Movimiento eliminado.");
      await refrescar();
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos eliminar el movimiento.");
    }
  }

  const sinConfigurar = resumen.ingresoBase === 0 && resumen.movimientos.length === 0;
  const esMesActual = resumen.mes === mesActual();
  const pendientes = resumen.recordatorios.filter((r) => r.activo && !r.pagado);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-[26px] leading-tight font-semibold text-tinta sm:text-3xl">
            Tu <span className="texto-degradado">panel</span>
          </h1>
          <p className="mt-1 text-[14px] text-tinta-3">
            {esMesActual
              ? pendientes.length > 0
                ? `Tienes ${pendientes.length} ${pendientes.length === 1 ? "pago pendiente" : "pagos pendientes"} este mes.`
                : "Vas al día con tus pagos del mes."
              : "Estás viendo un mes anterior."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SelectorMes mes={resumen.mes} onCambio={cargar} cargando={cargando} />
          <Boton onClick={() => setModal("gasto")} className="sm:ml-auto">
            <Plus className="size-4" aria-hidden="true" />
            Nuevo movimiento
          </Boton>
        </div>
      </header>

      {sinConfigurar && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tarjeta flex flex-col gap-3 border-verde/25 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[15px] font-medium text-tinta">Empieza por lo básico</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-tinta-3">
              Define tu ingreso mensual y la meta de ahorro para que los números
              de este panel signifiquen algo.
            </p>
          </div>
          <BotonEnlace href="/ajustes" variante="secundario" className="shrink-0">
            Configurar
            <ArrowRight className="size-4" aria-hidden="true" />
          </BotonEnlace>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <TarjetaKPI
          etiqueta="Ingreso"
          valor={resumen.ingresoTotal}
          detalle={
            resumen.ingresosExtra > 0
              ? `Incluye ${pesos(resumen.ingresosExtra)} de ingresos extra`
              : "Tu ingreso mensual fijo"
          }
          Icono={Wallet}
          retraso={0}
        />
        <TarjetaKPI
          etiqueta="Gastado"
          valor={resumen.gastado}
          detalle={
            resumen.ingresoTotal > 0
              ? `${Math.round((resumen.gastado / resumen.ingresoTotal) * 100)}% de tu ingreso`
              : undefined
          }
          Icono={TrendingDown}
          retraso={0.05}
        />
        <TarjetaKPI
          etiqueta="Ahorrado"
          valor={resumen.ahorradoMes}
          detalle="Aportes de este mes a tu meta"
          Icono={PiggyBank}
          tono="verde"
          retraso={0.1}
        />
        <TarjetaKPI
          etiqueta="Disponible"
          valor={resumen.disponible}
          detalle={
            resumen.disponible < 0
              ? "Estás por encima de tu ingreso"
              : "Lo que te queda después de gastos y ahorro"
          }
          Icono={Receipt}
          tono={resumen.disponible < 0 ? "alerta" : "neutro"}
          retraso={0.15}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta titulo="Meta de ahorro" retraso={0.05}>
          {resumen.metaAhorro > 0 ? (
            <div className="flex flex-col gap-5">
              <AnilloMeta
                progreso={resumen.progresoMeta}
                ahorrado={resumen.ahorroTotal}
                meta={resumen.metaAhorro}
              />
              <div className="text-center">
                <p className="font-display text-[15px] font-medium text-tinta">
                  {resumen.metaNombre}
                </p>
                <p className="mt-1 text-[13px] tabular text-tinta-2">
                  {pesos(resumen.ahorroTotal)} de {pesos(resumen.metaAhorro)}
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-tinta-3">
                  {resumen.progresoMeta >= 100
                    ? "Meta cumplida. Es momento de definir la siguiente."
                    : resumen.mesesRestantes !== null
                      ? `A tu ritmo actual llegas en unos ${resumen.mesesRestantes} ${resumen.mesesRestantes === 1 ? "mes" : "meses"}.`
                      : "Registra tu primer aporte para proyectar cuánto falta."}
                </p>
                {resumen.cuotaSugerida !== null && resumen.ajustes.metaFechaLimite && (
                  <p className="mt-2 rounded-lg border border-borde-suave bg-fondo-alto/60 px-3 py-2 text-[12.5px] leading-relaxed text-tinta-2">
                    Para llegar el {fechaLarga(resumen.ajustes.metaFechaLimite)} tendrías que
                    apartar{" "}
                    <span className="font-semibold tabular text-verde">
                      {pesos(resumen.cuotaSugerida)}
                    </span>{" "}
                    al mes.
                  </p>
                )}
              </div>
              <Boton variante="secundario" ancho onClick={() => setModal("ahorro")}>
                <PiggyBank className="size-4" aria-hidden="true" />
                Aportar al ahorro
              </Boton>
            </div>
          ) : (
            <Vacio mensaje="Define tu meta de ahorro en Ajustes y aquí verás cuánto te falta y en cuántos meses llegas.">
              <BotonEnlace href="/ajustes" variante="secundario" tamano="sm">
                Definir meta
              </BotonEnlace>
            </Vacio>
          )}
        </Tarjeta>

        <Tarjeta titulo="Gastos por categoría" className="lg:col-span-2" retraso={0.1}>
          {resumen.categorias.length > 0 ? (
            <BarrasCategorias categorias={resumen.categorias} />
          ) : (
            <Vacio mensaje="Sin gastos en este mes. Cuando registres el primero, verás aquí en qué se te va la plata.">
              <Boton variante="secundario" tamano="sm" onClick={() => setModal("gasto")}>
                <Plus className="size-4" aria-hidden="true" />
                Registrar gasto
              </Boton>
            </Vacio>
          )}
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Tarjeta titulo="Últimos 6 meses" className="lg:col-span-3" retraso={0.05}>
          <TendenciaMensual puntos={resumen.tendencia} />
        </Tarjeta>

        <Tarjeta
          titulo="Recordatorios"
          className="lg:col-span-2"
          retraso={0.1}
          accion={
            <Link
              href="/recordatorios"
              className="area-toque -my-3 flex items-center gap-1 py-3 text-[12.5px] text-tinta-3 transition-colors hover:text-verde"
            >
              Ver todos
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        >
          <ListaRecordatorios recordatorios={resumen.recordatorios} limite={5} />
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Tarjeta
          titulo="Movimientos del mes"
          className="lg:col-span-3"
          retraso={0.05}
          accion={
            <Link
              href="/movimientos"
              className="area-toque -my-3 flex items-center gap-1 py-3 text-[12.5px] text-tinta-3 transition-colors hover:text-verde"
            >
              Ver todos
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        >
          <ListaMovimientos
            movimientos={resumen.movimientos.slice(0, 8)}
            onEliminar={eliminarMovimiento}
            mensajeVacio="Todavía no hay movimientos en este mes."
          />
        </Tarjeta>

        <Tarjeta titulo="Para tener en cuenta" className="lg:col-span-2" retraso={0.1}>
          <ul className="flex flex-col gap-3.5">
            {resumen.consejos.map((consejo, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-verde/12 text-verde">
                  <Lightbulb className="size-3.5" aria-hidden="true" />
                </span>
                <p className="text-[13.5px] leading-relaxed text-tinta-2">{consejo}</p>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <ModalMovimiento
        abierto={modal !== null}
        tipoInicial={modal ?? "gasto"}
        onCerrar={() => setModal(null)}
        onGuardado={refrescar}
      />
    </div>
  );
}

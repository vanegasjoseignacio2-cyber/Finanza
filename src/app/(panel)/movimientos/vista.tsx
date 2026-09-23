"use client";

import { Download, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { useCaptura } from "@/components/captura";
import { useDatos } from "@/components/datos-panel";
import { ListaMovimientos } from "@/components/paneles/lista-movimientos";
import { SelectorMes } from "@/components/selector-mes";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { Cabecera } from "@/components/ui/cabecera";
import { Selector } from "@/components/ui/campo";
import { Tarjeta } from "@/components/ui/tarjeta";
import { pesos } from "@/lib/dinero";
import type { CuentaConSaldo, Movimiento, TipoMovimiento } from "@/lib/types";

interface Filtros {
  mes: string;
  tipo: string;
  categoria: string;
  cuenta: string;
  q: string;
}

const TIPOS = [
  { valor: "", etiqueta: "Todos" },
  { valor: "gasto", etiqueta: "Gastos" },
  { valor: "ingreso", etiqueta: "Ingresos" },
  { valor: "ahorro", etiqueta: "Aportes a metas" },
  { valor: "retiro", etiqueta: "Retiros de metas" },
  { valor: "transferencia", etiqueta: "Transferencias" },
];

const TIPO_CUENTA = { corriente: "Cuenta", efectivo: "Efectivo", ahorro: "Ahorro" } as const;

export function VistaMovimientos({
  movimientos,
  saldos,
  filtros,
}: {
  movimientos: Movimiento[];
  saldos: CuentaConSaldo[];
  filtros: Filtros;
}) {
  const router = useRouter();
  const captura = useCaptura();
  const { catalogo } = useDatos();
  const [cargando, iniciar] = useTransition();
  const [busqueda, setBusqueda] = useState(filtros.q);

  function ir(cambios: Partial<Filtros>) {
    const siguiente = { ...filtros, ...cambios };
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(siguiente)) if (valor) params.set(clave, valor);
    iniciar(() => router.push(`/movimientos${params.size ? `?${params}` : ""}`, { scroll: false }));
  }

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    ir({ q: busqueda.trim() });
  }

  const suma = (...tipos: TipoMovimiento[]) =>
    movimientos.filter((m) => tipos.includes(m.tipo)).reduce((s, m) => s + (m.tipo === "retiro" ? -m.monto : m.monto), 0);

  const otros = Object.fromEntries(
    Object.entries({ tipo: filtros.tipo, categoria: filtros.categoria, cuenta: filtros.cuenta }).filter(([, v]) => v),
  );
  const hayFiltros = Boolean(filtros.tipo || filtros.categoria || filtros.cuenta || filtros.q);
  const categorias = filtros.tipo === "ingreso" ? catalogo.ingreso : catalogo.gasto;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Cabecera
        titulo="Movimientos"
        subtitulo="Todo lo que entra, sale y se mueve entre tus cuentas."
        acciones={
          <>
            <BotonEnlace href="/api/exportar" descarga variante="secundario">
              <Download className="size-4" aria-hidden="true" />
              Exportar CSV
            </BotonEnlace>
            <Boton onClick={() => captura.abrir()} className="hidden lg:inline-flex">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo
            </Boton>
          </>
        }
      />

      {saldos.length > 0 && (
        <section aria-label="Saldos por cuenta">
          <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
            {saldos.map((c) => {
              const activa = filtros.cuenta === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => ir({ cuenta: activa ? "" : c.id })}
                    aria-pressed={activa}
                    className={`tarjeta flex w-full cursor-pointer flex-col gap-1 p-4 text-left transition-colors hover:border-borde ${
                      activa ? "border-verde/60" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-[12.5px] text-tinta-3">
                      <span className="truncate">{c.nombre}</span>
                      <span className="shrink-0">{TIPO_CUENTA[c.tipo]}</span>
                    </span>
                    <span className={`font-display text-[19px] font-semibold tabular ${c.saldo < 0 ? "text-alerta" : "text-tinta"}`}>
                      {pesos(c.saldo)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[12.5px] text-tinta-3">
            Saldos según lo que registras. Toca una cuenta para ver solo sus movimientos.
          </p>
        </section>
      )}

      <Tarjeta>
        <div className="flex flex-col gap-4">
          <form onSubmit={buscar} role="search" className="relative">
            <label htmlFor="buscar" className="sr-only">
              Buscar en todos los meses
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tinta-3" aria-hidden="true" />
            <input
              id="buscar"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nota o categoría, en todos los meses"
              className="min-h-11 w-full rounded-xl border border-borde bg-fondo-alto pr-3.5 pl-10 text-[15px] text-tinta placeholder:text-tinta-3 focus:border-verde focus:ring-2 focus:ring-verde/30 focus:outline-none"
            />
          </form>

          {!filtros.q && (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <SelectorMes mes={filtros.mes} ruta="/movimientos" otros={otros} />
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                <Selector etiqueta="Tipo" value={filtros.tipo} onChange={(e) => ir({ tipo: e.target.value, categoria: "" })}>
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </Selector>
                <Selector
                  etiqueta="Categoría"
                  value={filtros.categoria}
                  disabled={Boolean(filtros.tipo) && filtros.tipo !== "gasto" && filtros.tipo !== "ingreso"}
                  onChange={(e) => ir({ categoria: e.target.value })}
                >
                  <option value="">Todas</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Selector>
                <Selector etiqueta="Cuenta" value={filtros.cuenta} onChange={(e) => ir({ cuenta: e.target.value })}>
                  <option value="">Todas</option>
                  {saldos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Selector>
              </div>
            </div>
          )}

          {hayFiltros && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-tinta-3">
              <span>{filtros.q ? `Resultados para «${filtros.q}» en todos los meses.` : "Filtros aplicados."}</span>
              <Link
                href={filtros.mes ? `/movimientos?mes=${filtros.mes}` : "/movimientos"}
                onClick={() => setBusqueda("")}
                className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-tinta-2 hover:text-verde"
              >
                <X className="size-3.5" aria-hidden="true" />
                Quitar filtros
              </Link>
            </div>
          )}

          <dl className="grid grid-cols-3 gap-2 border-t border-borde-suave pt-4">
            {[
              { etiqueta: "Gastos", valor: suma("gasto"), clase: "text-tinta" },
              { etiqueta: "Ingresos", valor: suma("ingreso"), clase: "text-verde" },
              { etiqueta: "A metas (neto)", valor: suma("ahorro", "retiro"), clase: "text-azul" },
            ].map((d) => (
              <div key={d.etiqueta}>
                <dt className="text-[12px] text-tinta-3">{d.etiqueta}</dt>
                <dd className={`mt-0.5 text-[15px] font-semibold tabular ${d.clase}`}>{pesos(d.valor)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo={`${movimientos.length} ${movimientos.length === 1 ? "movimiento" : "movimientos"}`}
        className={cargando ? "opacity-60 transition-opacity" : "transition-opacity"}
      >
        <ListaMovimientos
          movimientos={movimientos}
          agrupar
          mensajeVacio={
            hayFiltros
              ? "Nada coincide con estos filtros."
              : "No hay movimientos en este mes. Usa el botón + para registrar uno."
          }
        />
      </Tarjeta>
    </div>
  );
}

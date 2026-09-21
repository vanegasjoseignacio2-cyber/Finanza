"use client";

import { Download, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { ListaMovimientos } from "@/components/paneles/lista-movimientos";
import { ModalMovimiento } from "@/components/paneles/modal-movimiento";
import { SelectorMes } from "@/components/selector-mes";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { useAvisos } from "@/components/ui/avisos";
import { Selector } from "@/components/ui/campo";
import { Tarjeta } from "@/components/ui/tarjeta";
import { CATEGORIAS_GASTO } from "@/lib/categorias";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import type { Movimiento, TipoMovimiento } from "@/lib/types";

const TIPOS: { valor: string; etiqueta: string }[] = [
  { valor: "", etiqueta: "Todos los tipos" },
  { valor: "gasto", etiqueta: "Solo gastos" },
  { valor: "ahorro", etiqueta: "Solo ahorro" },
  { valor: "ingreso", etiqueta: "Solo ingresos extra" },
];

export function VistaMovimientos({
  inicial,
  mesInicial,
}: {
  inicial: Movimiento[];
  mesInicial: string;
}) {
  const avisos = useAvisos();
  const [movimientos, setMovimientos] = useState(inicial);
  const [mes, setMes] = useState(mesInicial);
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState(false);

  const cargar = useCallback(
    async (nuevoMes = mes, nuevoTipo = tipo, nuevaCategoria = categoria) => {
      setCargando(true);
      try {
        const params = new URLSearchParams({ mes: nuevoMes });
        if (nuevoTipo) params.set("tipo", nuevoTipo);
        if (nuevaCategoria) params.set("categoria", nuevaCategoria);
        const datos = await peticion<{ movimientos: Movimiento[] }>(
          `/api/movimientos?${params}`,
        );
        setMovimientos(datos.movimientos);
      } catch (e) {
        avisos.error(e instanceof Error ? e.message : "No pudimos cargar los movimientos.");
      } finally {
        setCargando(false);
      }
    },
    [avisos, mes, tipo, categoria],
  );

  async function eliminar(id: string) {
    try {
      await peticion(`/api/movimientos/${id}`, { method: "DELETE" });
      setMovimientos((previos) => previos.filter((m) => m.id !== id));
      avisos.exito("Movimiento eliminado.");
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos eliminar el movimiento.");
    }
  }

  const total = (t: TipoMovimiento) =>
    movimientos.filter((m) => m.tipo === t).reduce((s, m) => s + m.monto, 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-[26px] leading-tight font-semibold text-tinta sm:text-3xl">
            Movimientos
          </h1>
          <p className="mt-1 text-[14px] text-tinta-3">
            Todo lo que entra y sale, mes por mes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotonEnlace href="/api/exportar" descarga variante="secundario">
            <Download className="size-4" aria-hidden="true" />
            Exportar CSV
          </BotonEnlace>
          <Boton onClick={() => setModal(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo
          </Boton>
        </div>
      </header>

      <Tarjeta>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <SelectorMes
              mes={mes}
              cargando={cargando}
              onCambio={(nuevo) => {
                setMes(nuevo);
                cargar(nuevo, tipo, categoria);
              }}
            />
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <Selector
                etiqueta="Tipo"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  if (e.target.value !== "gasto") setCategoria("");
                  cargar(mes, e.target.value, e.target.value === "gasto" ? categoria : "");
                }}
              >
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </Selector>
              <Selector
                etiqueta="Categoría"
                value={categoria}
                disabled={tipo !== "" && tipo !== "gasto"}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  cargar(mes, tipo, e.target.value);
                }}
              >
                <option value="">Todas</option>
                {CATEGORIAS_GASTO.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Selector>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2 border-t border-borde-suave pt-4">
            {[
              { etiqueta: "Gastos", valor: total("gasto"), clase: "text-tinta" },
              { etiqueta: "Ahorro", valor: total("ahorro"), clase: "text-verde" },
              { etiqueta: "Ingresos extra", valor: total("ingreso"), clase: "text-azul" },
            ].map((dato) => (
              <div key={dato.etiqueta}>
                <dt className="text-[12px] text-tinta-3">{dato.etiqueta}</dt>
                <dd className={`mt-0.5 text-[15px] font-semibold tabular ${dato.clase}`}>
                  {pesos(dato.valor)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo={`${movimientos.length} ${movimientos.length === 1 ? "movimiento" : "movimientos"}`}
        retraso={0.05}
      >
        <ListaMovimientos
          movimientos={movimientos}
          onEliminar={eliminar}
          mensajeVacio="No hay movimientos con estos filtros. Prueba con otro mes o quita los filtros."
        />
      </Tarjeta>

      <ModalMovimiento
        abierto={modal}
        onCerrar={() => setModal(false)}
        onGuardado={() => cargar()}
      />
    </div>
  );
}

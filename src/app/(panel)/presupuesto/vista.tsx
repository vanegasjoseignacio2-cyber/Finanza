"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDatos } from "@/components/datos-panel";
import { TendenciaMensual } from "@/components/graficos/tendencia-mensual";
import { Icono } from "@/components/iconos";
import { Barra } from "@/components/paneles/barra";
import { ListaPagosFijos, ModalPagoFijo } from "@/components/paneles/pagos-fijos";
import { SelectorMes } from "@/components/selector-mes";
import { useAvisos } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { Cabecera } from "@/components/ui/cabecera";
import { Selector } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Modal } from "@/components/ui/modal";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import type { PresupuestoCalculado, Resumen } from "@/lib/types";

const ESTADO_BARRA = { ok: "normal", cerca: "cerca", excedido: "excedido" } as const;

function textoEstado(p: PresupuestoCalculado): { texto: string; clase: string } {
  if (p.estado === "excedido") return { texto: `Te pasaste ${pesos(p.gastado - p.tope)}`, clase: "text-alerta" };
  if (p.estado === "cerca") return { texto: `Quedan ${pesos(p.tope - p.gastado)} · ${p.porcentaje}%`, clase: "text-aviso" };
  return { texto: `Quedan ${pesos(p.tope - p.gastado)} · ${p.porcentaje}%`, clase: "text-tinta-3" };
}

export function VistaPresupuesto({ resumen: r }: { resumen: Resumen }) {
  const { catalogo } = useDatos();
  const [tope, setTope] = useState<{ categoria: string; tope: number | null } | null>(null);
  const [nuevoFijo, setNuevoFijo] = useState(false);

  const conTope = new Set(r.presupuestos.map((p) => p.categoria));
  const sinTope = r.categorias.filter((c) => !conTope.has(c.categoria));
  const totalTopes = r.presupuestos.reduce((s, p) => s + p.tope, 0);
  const gastadoConTope = r.presupuestos.reduce((s, p) => s + p.gastado, 0);
  const totalFijos = r.recordatorios.filter((x) => x.activo).reduce((s, x) => s + x.montoEstimado, 0);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Cabecera
        titulo="Presupuesto"
        subtitulo="Cuánto te permites por categoría y qué pagos se repiten cada mes."
        acciones={<SelectorMes mes={r.mes} ruta="/presupuesto" />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Tarjeta
          titulo="Topes por categoría"
          className="lg:col-span-3"
          accion={
            <Boton tamano="sm" variante="secundario" onClick={() => setTope({ categoria: "", tope: null })}>
              <Plus className="size-4" aria-hidden="true" />
              Tope
            </Boton>
          }
        >
          {r.presupuestos.length > 0 && (
            <p className="mb-4 text-[13.5px] text-tinta-2">
              En las categorías con tope llevas <span className="font-semibold tabular text-tinta">{pesos(gastadoConTope)}</span> de{" "}
              <span className="tabular">{pesos(totalTopes)}</span>.
            </p>
          )}

          {r.presupuestos.length === 0 ? (
            <Vacio mensaje="Sin topes todavía. Empieza por la categoría que más te preocupa: comida fuera, ocio o compras.">
              <Boton tamano="sm" variante="secundario" onClick={() => setTope({ categoria: "", tope: null })}>
                Fijar el primer tope
              </Boton>
            </Vacio>
          ) : (
            <ul className="flex flex-col gap-4">
              {r.presupuestos.map((p) => {
                const c = catalogo.obtener(p.categoria);
                const e = textoEstado(p);
                return (
                  <li key={p.categoria} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5">
                      <Icono nombre={c.icono} className="size-4 shrink-0 text-tinta-3" />
                      <span className="min-w-0 flex-1 truncate text-[14px] text-tinta">{c.label}</span>
                      <span className="shrink-0 text-[13.5px] tabular text-tinta-2">
                        {pesos(p.gastado)} <span className="text-tinta-3">/ {pesos(p.tope)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setTope({ categoria: p.categoria, tope: p.tope })}
                        aria-label={`Cambiar el tope de ${c.label}`}
                        className="area-toque grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-tinta-3 hover:bg-superficie-alta hover:text-tinta"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <Barra
                      porcentaje={p.porcentaje}
                      estado={ESTADO_BARRA[p.estado]}
                      etiqueta={`${c.label}: ${p.porcentaje}% del tope`}
                    />
                    <span className={`text-[12.5px] tabular ${e.clase}`}>{e.texto}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {sinTope.length > 0 && (
            <div className="mt-6 border-t border-borde-suave pt-4">
              <h3 className="mb-2 text-[12.5px] font-semibold tracking-wide text-tinta-3 uppercase">Gastos sin tope</h3>
              <ul className="flex flex-col">
                {sinTope.map((s) => {
                  const c = catalogo.obtener(s.categoria);
                  return (
                    <li key={s.categoria} className="flex items-center gap-2.5 py-1.5">
                      <Icono nombre={c.icono} className="size-4 shrink-0 text-tinta-3" />
                      <span className="min-w-0 flex-1 truncate text-[14px] text-tinta-2">{c.label}</span>
                      <span className="shrink-0 text-[13.5px] tabular text-tinta-2">{pesos(s.total)}</span>
                      <Boton tamano="sm" variante="fantasma" onClick={() => setTope({ categoria: s.categoria, tope: null })}>
                        Fijar tope
                      </Boton>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Tarjeta>

        <Tarjeta
          id="pagos-fijos"
          titulo="Pagos fijos"
          className="scroll-mt-24 lg:col-span-2"
          retraso={0.05}
          accion={
            <Boton tamano="sm" variante="secundario" onClick={() => setNuevoFijo(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Nuevo
            </Boton>
          }
        >
          {totalFijos > 0 && (
            <p className="mb-3 text-[13.5px] text-tinta-2">
              Suman <span className="font-semibold tabular text-tinta">{pesos(totalFijos)}</span> al mes
              {r.fijosPendientes > 0 && r.momento === "actual" ? (
                <>
                  ; faltan <span className="font-semibold tabular text-tinta">{pesos(r.fijosPendientes)}</span> este mes.
                </>
              ) : (
                "."
              )}
            </p>
          )}
          {r.momento !== "actual" && (
            <p className="mb-3 text-[12.5px] text-tinta-3">El estado de cada pago es el del mes en curso.</p>
          )}
          <ListaPagosFijos recordatorios={r.recordatorios} completa />
        </Tarjeta>
      </div>

      <Tarjeta titulo="Últimos 6 meses" retraso={0.1}>
        <TendenciaMensual puntos={r.tendencia} />
      </Tarjeta>

      <ModalTope estado={tope} onCerrar={() => setTope(null)} />
      <ModalPagoFijo abierto={nuevoFijo} recordatorio={null} onCerrar={() => setNuevoFijo(false)} />
    </div>
  );
}

function ModalTope({
  estado,
  onCerrar,
}: {
  estado: { categoria: string; tope: number | null } | null;
  onCerrar: () => void;
}) {
  return (
    <Modal
      abierto={estado !== null}
      onCerrar={onCerrar}
      titulo={estado?.tope ? "Cambiar tope" : "Fijar tope"}
      descripcion="Es el máximo que te permites en la categoría cada mes. Te avisamos al llegar al 85%."
    >
      {estado && <FormularioTope key={estado.categoria || "nuevo"} inicial={estado} onListo={onCerrar} />}
    </Modal>
  );
}

function FormularioTope({
  inicial,
  onListo,
}: {
  inicial: { categoria: string; tope: number | null };
  onListo: () => void;
}) {
  const router = useRouter();
  const avisos = useAvisos();
  const { catalogo } = useDatos();
  const [categoria, setCategoria] = useState(inicial.categoria || catalogo.gasto[0]?.id || "");
  const [tope, setTope] = useState<number | null>(inicial.tope);
  const [guardando, setGuardando] = useState<"guardar" | "quitar" | null>(null);
  const [error, setError] = useState("");

  async function guardar(valor: number, accion: "guardar" | "quitar") {
    setGuardando(accion);
    setError("");
    try {
      await peticion("/api/presupuestos", { method: "PUT", body: JSON.stringify({ categoria, tope: valor }) });
      avisos.exito(valor > 0 ? "Tope guardado." : "Tope quitado.");
      router.refresh();
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar el tope.");
    } finally {
      setGuardando(null);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!tope || tope <= 0) return setError("Escribe un tope mayor que cero.");
    void guardar(tope, "guardar");
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Selector
        etiqueta="Categoría"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        disabled={Boolean(inicial.categoria)}
      >
        {catalogo.gasto.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </Selector>
      <CampoDinero etiqueta="Tope mensual" valor={tope} onCambio={setTope} requerido autoFocus error={error || undefined} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        {inicial.tope ? (
          <Boton
            type="button"
            variante="fantasma"
            tamano="sm"
            className="sm:mr-auto"
            cargando={guardando === "quitar"}
            onClick={() => guardar(0, "quitar")}
          >
            Quitar tope
          </Boton>
        ) : null}
        <Boton type="submit" cargando={guardando === "guardar"} className="sm:ml-auto">
          Guardar tope
        </Boton>
      </div>
    </form>
  );
}

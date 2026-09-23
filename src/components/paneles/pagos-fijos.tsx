"use client";

import {
  Bell,
  BellOff,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDatos } from "@/components/datos-panel";
import { Icono } from "@/components/iconos";
import { useAvisos } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Modal } from "@/components/ui/modal";
import { Vacio } from "@/components/ui/tarjeta";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import { fechaCorta, hoyISO } from "@/lib/fechas";
import type { RecordatorioCalculado } from "@/lib/types";

/* ─── Estado visible de un pago ──────────────────────────────────────────── */

function estado(r: RecordatorioCalculado) {
  if (!r.activo) return { texto: "En pausa", clase: "border-borde text-tinta-3", Icono: BellOff };
  if (r.pagado) return { texto: "Pagado", clase: "border-verde/40 text-verde", Icono: CircleCheck };
  if (r.vencido) {
    const d = Math.abs(r.diasFaltantes);
    return { texto: `Vencido hace ${d} ${d === 1 ? "día" : "días"}`, clase: "border-alerta/50 text-alerta", Icono: CircleAlert };
  }
  if (r.diasFaltantes === 0) return { texto: "Vence hoy", clase: "border-alerta/50 text-alerta", Icono: CircleAlert };
  if (r.diasFaltantes <= 3) {
    return {
      texto: r.diasFaltantes === 1 ? "Mañana" : `En ${r.diasFaltantes} días`,
      clase: "border-aviso/50 text-aviso",
      Icono: CalendarClock,
    };
  }
  return { texto: `En ${r.diasFaltantes} días`, clase: "border-borde text-tinta-3", Icono: CalendarClock };
}

function Insignia({ r }: { r: RecordatorioCalculado }) {
  const e = estado(r);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${e.clase}`}>
      <e.Icono className="size-3.5" aria-hidden="true" />
      {e.texto}
    </span>
  );
}

/* ─── Lista ──────────────────────────────────────────────────────────────── */

export function ListaPagosFijos({
  recordatorios,
  completa = false,
  limite,
}: {
  recordatorios: RecordatorioCalculado[];
  completa?: boolean;
  limite?: number;
}) {
  const router = useRouter();
  const avisos = useAvisos();
  const { catalogo } = useDatos();
  const [pagando, setPagando] = useState<RecordatorioCalculado | null>(null);
  const [editando, setEditando] = useState<RecordatorioCalculado | null>(null);
  const [confirmando, setConfirmando] = useState<{ id: string; accion: "eliminar" | "deshacer" } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const visibles = limite ? recordatorios.slice(0, limite) : recordatorios;
  if (visibles.length === 0) {
    return (
      <Vacio mensaje="No tienes pagos fijos. Agrégalos (arriendo, celular, seguros) para que lo libre los descuente antes de que lleguen." />
    );
  }

  async function ejecutar(id: string, accion: () => Promise<unknown>, mensaje: string) {
    setOcupado(id);
    try {
      await accion();
      avisos.exito(mensaje);
      router.refresh();
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos actualizar el pago fijo.");
    } finally {
      setOcupado(null);
      setConfirmando(null);
    }
  }

  const mes = hoyISO().slice(0, 7);
  const boton =
    "area-toque grid size-9 cursor-pointer place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-superficie-alta hover:text-tinta disabled:opacity-50";

  return (
    <>
      <ul className="flex flex-col">
        {visibles.map((r) => {
          const monto = r.pagado && r.montoPagado !== null ? r.montoPagado : r.montoEstimado;
          const conConfirmacion = confirmando?.id === r.id;
          return (
            <li key={r.id} className="border-b border-borde-suave py-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-superficie-alta text-tinta-2">
                  {r.categoria ? (
                    <Icono nombre={catalogo.obtener(r.categoria).icono} />
                  ) : (
                    <Bell className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] text-tinta">{r.titulo}</p>
                  <p className="text-[12.5px] text-tinta-3">
                    Día {r.dia} · {fechaCorta(r.vencimiento)}
                    {monto > 0 ? ` · ${pesos(monto)}` : " · sin monto estimado"}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-2 ${
                    // En la lista completa las acciones van siempre en su propia
                    // línea: en columnas estrechas aplastaban el nombre del pago.
                    completa ? "w-full flex-wrap justify-between pl-12" : "shrink-0"
                  }`}
                >
                  {!completa && r.activo && !r.pagado ? (
                    <Boton tamano="sm" variante="secundario" onClick={() => setPagando(r)}>
                      Registrar pago
                    </Boton>
                  ) : (
                    <Insignia r={r} />
                  )}

                  {completa && (
                    <span className="flex flex-wrap items-center justify-end gap-1">
                      {conConfirmacion ? (
                        <>
                          <Boton
                            tamano="sm"
                            variante="peligro"
                            cargando={ocupado === r.id}
                            onClick={() =>
                              confirmando.accion === "eliminar"
                                ? ejecutar(r.id, () => peticion(`/api/recordatorios/${r.id}`, { method: "DELETE" }), "Pago fijo eliminado.")
                                : ejecutar(
                                    r.id,
                                    () => peticion(`/api/recordatorios/${r.id}/pago?mes=${mes}`, { method: "DELETE" }),
                                    "Pago deshecho: vuelve a contar como pendiente.",
                                  )
                            }
                          >
                            {confirmando.accion === "eliminar" ? "Eliminar" : "Deshacer"}
                          </Boton>
                          <Boton tamano="sm" variante="fantasma" onClick={() => setConfirmando(null)}>
                            No
                          </Boton>
                        </>
                      ) : (
                        <>
                          {r.activo && !r.pagado && (
                            <Boton tamano="sm" variante="secundario" onClick={() => setPagando(r)}>
                              Registrar pago
                            </Boton>
                          )}
                          {r.pagado && (
                            <button
                              type="button"
                              className={boton}
                              aria-label={`Deshacer el pago de ${r.titulo} de este mes`}
                              onClick={() => setConfirmando({ id: r.id, accion: "deshacer" })}
                            >
                              <Undo2 className="size-4" aria-hidden="true" />
                            </button>
                          )}
                          <button type="button" className={boton} aria-label={`Editar ${r.titulo}`} onClick={() => setEditando(r)}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={boton}
                            disabled={ocupado === r.id}
                            aria-label={r.activo ? `Pausar ${r.titulo}` : `Reactivar ${r.titulo}`}
                            onClick={() =>
                              ejecutar(
                                r.id,
                                () =>
                                  peticion(`/api/recordatorios/${r.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ activo: !r.activo }),
                                  }),
                                r.activo ? "Pago en pausa: no se descuenta ni se avisa." : "Pago reactivado.",
                              )
                            }
                          >
                            {r.activo ? <BellOff className="size-4" aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
                          </button>
                          <button
                            type="button"
                            className={`${boton} hover:bg-alerta/10 hover:text-alerta`}
                            aria-label={`Eliminar ${r.titulo}`}
                            onClick={() => setConfirmando({ id: r.id, accion: "eliminar" })}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <ModalPago recordatorio={pagando} onCerrar={() => setPagando(null)} />
      <ModalPagoFijo abierto={editando !== null} recordatorio={editando} onCerrar={() => setEditando(null)} />
    </>
  );
}

/* ─── Registrar un pago ──────────────────────────────────────────────────── */

export function ModalPago({
  recordatorio,
  onCerrar,
}: {
  recordatorio: RecordatorioCalculado | null;
  onCerrar: () => void;
}) {
  return (
    <Modal
      abierto={recordatorio !== null}
      onCerrar={onCerrar}
      titulo={recordatorio ? `Pagar ${recordatorio.titulo}` : "Registrar pago"}
      descripcion="Crea el gasto de este mes y deja de descontarse como pendiente."
    >
      {recordatorio && <FormularioPago key={recordatorio.id} r={recordatorio} onListo={onCerrar} />}
    </Modal>
  );
}

function FormularioPago({ r, onListo }: { r: RecordatorioCalculado; onListo: () => void }) {
  const router = useRouter();
  const avisos = useAvisos();
  const { cuentas } = useDatos();
  const activas = cuentas.filter((c) => !c.archivada);
  const [monto, setMonto] = useState<number | null>(r.montoEstimado || null);
  const [fecha, setFecha] = useState(hoyISO());
  const [cuentaId, setCuentaId] = useState(activas[0]?.id ?? "");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState<"pago" | "manual" | null>(null);

  async function registrar(evento: FormEvent) {
    evento.preventDefault();
    if (!monto) {
      setError("Escribe cuánto pagaste.");
      return;
    }
    setGuardando("pago");
    setError("");
    try {
      await peticion(`/api/recordatorios/${r.id}/pago`, {
        method: "POST",
        body: JSON.stringify({ monto, fecha, cuentaId, nota }),
      });
      avisos.exito(`${r.titulo}: pago registrado.`);
      router.refresh();
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos registrar el pago.");
    } finally {
      setGuardando(null);
    }
  }

  async function marcarSinGasto() {
    setGuardando("manual");
    try {
      await peticion(`/api/recordatorios/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pagadoManual: true, mes: hoyISO().slice(0, 7) }),
      });
      avisos.exito(`${r.titulo}: marcado como pagado, sin registrar gasto.`);
      router.refresh();
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos marcarlo.");
    } finally {
      setGuardando(null);
    }
  }

  return (
    <form onSubmit={registrar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoDinero
          etiqueta="Monto pagado"
          valor={monto}
          onCambio={setMonto}
          requerido
          autoFocus
          ayuda={r.montoEstimado > 0 ? `Estimado: ${pesos(r.montoEstimado)}` : undefined}
        />
        <Campo etiqueta="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
      </div>
      {activas.length > 1 && (
        <Selector etiqueta="Sale de" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
          {activas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Selector>
      )}
      <Campo etiqueta="Nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder={r.titulo} maxLength={160} />

      {error && (
        <p role="alert" className="text-[13px] text-alerta">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <Boton
          type="button"
          variante="fantasma"
          tamano="sm"
          className="sm:mr-auto"
          cargando={guardando === "manual"}
          onClick={marcarSinGasto}
        >
          Ya estaba pagado (sin registrar gasto)
        </Boton>
        <Boton type="submit" cargando={guardando === "pago"}>
          Registrar pago
        </Boton>
      </div>
    </form>
  );
}

/* ─── Crear o editar un pago fijo ────────────────────────────────────────── */

export function ModalPagoFijo({
  abierto,
  recordatorio,
  onCerrar,
}: {
  abierto: boolean;
  recordatorio: RecordatorioCalculado | null;
  onCerrar: () => void;
}) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={recordatorio ? "Editar pago fijo" : "Nuevo pago fijo"}
      descripcion="Se repite cada mes. Mientras no lo pagues, lo libre para gastar lo descuenta."
    >
      <FormularioPagoFijo key={recordatorio?.id ?? "nuevo"} r={recordatorio} onListo={onCerrar} />
    </Modal>
  );
}

function FormularioPagoFijo({ r, onListo }: { r: RecordatorioCalculado | null; onListo: () => void }) {
  const router = useRouter();
  const avisos = useAvisos();
  const { catalogo } = useDatos();
  const [titulo, setTitulo] = useState(r?.titulo ?? "");
  const [dia, setDia] = useState(String(r?.dia ?? 5));
  const [monto, setMonto] = useState<number | null>(r?.montoEstimado || null);
  const [categoria, setCategoria] = useState(r?.categoria ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const diaNumero = Number(dia);
    if (!titulo.trim()) return setError("Ponle un nombre.");
    if (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > 31) return setError("El día debe estar entre 1 y 31.");
    setGuardando(true);
    setError("");
    try {
      await peticion(r ? `/api/recordatorios/${r.id}` : "/api/recordatorios", {
        method: r ? "PATCH" : "POST",
        body: JSON.stringify({ titulo, dia: diaNumero, montoEstimado: monto ?? 0, categoria }),
      });
      avisos.exito(r ? "Pago fijo actualizado." : "Pago fijo creado.");
      router.refresh();
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardarlo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Arriendo, plan celular, seguro de la moto..."
        maxLength={80}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Día del mes"
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          ayuda="Si el mes no tiene ese día, se usa el último."
          required
        />
        <CampoDinero
          etiqueta="Monto estimado"
          valor={monto}
          onCambio={setMonto}
          ayuda="Sin monto, lo libre no puede descontarlo."
        />
      </div>
      <Selector etiqueta="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
        <option value="">Sin categoría (se registra en Otros)</option>
        {catalogo.gasto.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </Selector>
      {error && (
        <p role="alert" className="text-[13px] text-alerta">
          {error}
        </p>
      )}
      <Boton type="submit" cargando={guardando} className="self-end">
        {r ? "Guardar cambios" : "Crear pago fijo"}
      </Boton>
    </form>
  );
}

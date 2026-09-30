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
import { Confirmar } from "@/components/ui/confirmar";
import { Modal } from "@/components/ui/modal";
import { Segmentado } from "@/components/ui/segmentado";
import { Vacio } from "@/components/ui/tarjeta";
import { Tooltip } from "@/components/ui/tooltip";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import { fechaCorta, hoyISO, nombreMes, proximoVencimiento } from "@/lib/fechas";
import type { RecordatorioCalculado } from "@/lib/types";

/* ─── Estado visible de un pago ──────────────────────────────────────────── */

function estado(r: RecordatorioCalculado) {
  if (!r.activo) return { texto: "En pausa", clase: "border-borde text-tinta-3", Icono: BellOff };
  if (r.pagado) return { texto: "Pagado", clase: "border-verde/40 text-verde", Icono: CircleCheck };
  if (!r.esteMes && r.fecha === null && r.desde) {
    return { texto: `Empieza en ${nombreMes(r.desde)}`, clase: "border-borde text-tinta-3", Icono: CalendarClock };
  }
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

/** "Hoy", "Mañana", "Faltan 5 días", "Venció hace 2 días". */
export function textoFalta(dias: number): string {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias < 0) return `Venció hace ${-dias} ${dias === -1 ? "día" : "días"}`;
  return `Faltan ${dias} días`;
}

/** Cuenta regresiva grande: cuántos días faltan, en el color de la urgencia. */
export function Regresiva({ r, grande = false }: { r: RecordatorioCalculado; grande?: boolean }) {
  const d = r.diasFaltantes;
  const tono = r.pagado
    ? "border-verde/30 text-verde"
    : d < 0
      ? "border-alerta/40 bg-alerta/10 text-alerta"
      : d <= 3
        ? "border-aviso/40 bg-aviso/10 text-aviso"
        : "border-borde-suave bg-superficie-alta text-tinta";
  return (
    <div
      aria-hidden="true"
      className={`grid shrink-0 place-content-center rounded-xl border text-center leading-none ${tono} ${grande ? "size-16" : "size-12"}`}
    >
      {d === 0 ? (
        <span className={`font-bold uppercase ${grande ? "text-[14px]" : "text-[12px]"}`}>Hoy</span>
      ) : (
        <>
          <span className={`font-display font-semibold tabular ${grande ? "text-[24px]" : "text-[18px]"}`}>{Math.abs(d)}</span>
          <span className="mt-1 text-[9.5px] tracking-wide uppercase">{d < 0 ? "tarde" : d === 1 ? "día" : "días"}</span>
        </>
      )}
    </div>
  );
}

/** Cuándo cae: "Día 5 · 5 oct" si se repite cada mes, "Una vez · 15 nov" si no. */
export function cuandoCae(r: RecordatorioCalculado): string {
  return r.fecha ? `Una vez · ${fechaCorta(r.fecha)}` : `Día ${r.dia} · ${fechaCorta(r.vencimiento)}`;
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
  const [confirmando, setConfirmando] = useState<{ r: RecordatorioCalculado; accion: "eliminar" | "deshacer" } | null>(null);
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
          return (
            <li key={r.id} className="border-b border-borde-suave py-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {completa ? (
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-superficie-alta text-tinta-2">
                    {r.categoria ? (
                      <Icono nombre={catalogo.obtener(r.categoria).icono} />
                    ) : (
                      <Bell className="size-4" aria-hidden="true" />
                    )}
                  </span>
                ) : (
                  <Regresiva r={r} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] text-tinta">{r.titulo}</p>
                  <p className="text-[12.5px] text-tinta-3">
                    {!completa &&
                      (r.pagado ? (
                        <span className="text-verde">
                          Pagado · el próximo {r.diasFaltantes === 1 ? "es mañana" : `en ${r.diasFaltantes} días`} ·{" "}
                        </span>
                      ) : (
                        <span className={r.diasFaltantes < 0 ? "text-alerta" : r.diasFaltantes <= 3 ? "text-aviso" : "text-tinta-2"}>
                          {textoFalta(r.diasFaltantes)} ·{" "}
                        </span>
                      ))}
                    {cuandoCae(r)}
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
                  ) : !completa && r.pagado ? null : (
                    <Insignia r={r} />
                  )}

                  {completa && (
                    <span className="flex flex-wrap items-center justify-end gap-1">
                        <>
                          {r.activo && !r.pagado && (
                            <Boton tamano="sm" variante="secundario" onClick={() => setPagando(r)}>
                              Registrar pago
                            </Boton>
                          )}
                          {r.pagado && (
                            <Tooltip texto="Deshacer pago">
                              <button
                                type="button"
                                className={boton}
                                aria-label={`Deshacer el pago de ${r.titulo} de este mes`}
                                onClick={() => setConfirmando({ r, accion: "deshacer" })}
                              >
                                <Undo2 className="size-4" aria-hidden="true" />
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip texto="Editar">
                            <button type="button" className={boton} aria-label={`Editar ${r.titulo}`} onClick={() => setEditando(r)}>
                              <Pencil className="size-4" aria-hidden="true" />
                            </button>
                          </Tooltip>
                          <Tooltip texto={r.activo ? "Pausar" : "Reactivar"}>
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
                          </Tooltip>
                          <Tooltip texto="Eliminar">
                            <button
                              type="button"
                              className={`${boton} hover:bg-alerta/10 hover:text-alerta`}
                              aria-label={`Eliminar ${r.titulo}`}
                              onClick={() => setConfirmando({ r, accion: "eliminar" })}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        </>
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
      <Confirmar
        abierto={confirmando !== null}
        titulo={confirmando?.accion === "deshacer" ? "¿Deshacer este pago?" : `¿Eliminar ${confirmando?.r.titulo ?? ""}?`}
        descripcion={
          confirmando?.accion === "deshacer"
            ? "Se borra el gasto que lo pagó y vuelve a contar como pendiente."
            : "Deja de avisarte y de descontarse. Los gastos que ya registraste con él se conservan."
        }
        accion={confirmando?.accion === "deshacer" ? "Deshacer pago" : "Eliminar"}
        icono={confirmando?.accion === "deshacer" ? <Undo2 className="size-4" aria-hidden="true" /> : undefined}
        onCerrar={() => setConfirmando(null)}
        onConfirmar={() => {
          if (!confirmando) return;
          const { r, accion } = confirmando;
          return accion === "eliminar"
            ? ejecutar(r.id, () => peticion(`/api/recordatorios/${r.id}`, { method: "DELETE" }), `${r.titulo}: eliminado.`)
            : ejecutar(
                r.id,
                () => peticion(`/api/recordatorios/${r.id}/pago?mes=${mes}`, { method: "DELETE" }),
                "Pago deshecho: vuelve a contar como pendiente.",
              );
        }}
      />
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

type Frecuencia = "mensual" | "unico";

/**
 * Crear o editar un pago fijo. Con `fechaInicial` (o `unico`) abre directo en
 * "Una sola vez": un gasto programado para un solo día, como un cumpleaños.
 */
export function ModalPagoFijo({
  abierto,
  recordatorio,
  onCerrar,
  unico = false,
  fechaInicial,
}: {
  abierto: boolean;
  recordatorio: RecordatorioCalculado | null;
  onCerrar: () => void;
  unico?: boolean;
  fechaInicial?: string;
}) {
  const programado = recordatorio ? recordatorio.fecha !== null : unico || Boolean(fechaInicial);
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={recordatorio ? (programado ? "Editar gasto programado" : "Editar pago fijo") : programado ? "Programar gasto" : "Nuevo pago fijo"}
      descripcion="Mientras no lo pagues, lo libre para gastar de su mes lo descuenta, y te avisamos cuántos días faltan."
    >
      <FormularioPagoFijo
        key={recordatorio?.id ?? `nuevo-${programado}-${fechaInicial ?? ""}`}
        r={recordatorio}
        frecuenciaInicial={programado ? "unico" : "mensual"}
        fechaInicial={fechaInicial}
        onListo={onCerrar}
      />
    </Modal>
  );
}

function FormularioPagoFijo({
  r,
  frecuenciaInicial,
  fechaInicial,
  onListo,
}: {
  r: RecordatorioCalculado | null;
  frecuenciaInicial: Frecuencia;
  fechaInicial?: string;
  onListo: () => void;
}) {
  const router = useRouter();
  const avisos = useAvisos();
  const { catalogo } = useDatos();
  const hoy = hoyISO();
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(frecuenciaInicial);
  const [titulo, setTitulo] = useState(r?.titulo ?? "");
  const [dia, setDia] = useState(String(r?.dia ?? 5));
  const [fecha, setFecha] = useState(r?.fecha ?? fechaInicial ?? hoy);
  const [monto, setMonto] = useState<number | null>(r?.montoEstimado || null);
  const [categoria, setCategoria] = useState(r?.categoria ?? "");
  // Al crear, se sugiere el mes en que cae el próximo pago: si el día de este
  // mes ya pasó, empieza el mes que viene (así no nace "vencido"). Al editar,
  // se respeta lo guardado y vacío significa "desde ya".
  const [desdeElegido, setDesdeElegido] = useState<string | null>(r ? (r.desde ?? "") : null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const unico = frecuencia === "unico";
  const diaValido = Number.isInteger(Number(dia)) && Number(dia) >= 1 && Number(dia) <= 31;
  const desde = desdeElegido ?? (diaValido ? proximoVencimiento(Number(dia), hoy).slice(0, 7) : hoy.slice(0, 7));
  const yaPasoEsteMes = diaValido && Number(dia) < Number(hoy.slice(8, 10));

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const diaNumero = Number(dia);
    if (!titulo.trim()) return setError("Ponle un nombre.");
    if (unico && !fecha) return setError("Elige la fecha.");
    if (unico && !r && fecha < hoy) return setError("La fecha ya pasó: elige hoy o un día que venga.");
    if (!unico && (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > 31)) return setError("El día debe estar entre 1 y 31.");
    setGuardando(true);
    setError("");
    try {
      await peticion(r ? `/api/recordatorios/${r.id}` : "/api/recordatorios", {
        method: r ? "PATCH" : "POST",
        body: JSON.stringify({
          titulo,
          dia: unico ? Number(fecha.slice(8, 10)) : diaNumero,
          fecha: unico ? fecha : null,
          desde: unico ? null : desde,
          montoEstimado: monto ?? 0,
          categoria,
        }),
      });
      avisos.exito(r ? "Cambios guardados." : unico ? `${titulo.trim()}: programado.` : "Pago fijo creado.");
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
      <Segmentado<Frecuencia>
        etiqueta="Se repite"
        columnas="grid-cols-2"
        valor={frecuencia}
        onCambio={setFrecuencia}
        opciones={[
          { valor: "mensual", etiqueta: "Cada mes" },
          { valor: "unico", etiqueta: "Una sola vez" },
        ]}
      />
      <Campo
        etiqueta="Nombre"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={unico ? "Cumpleaños de mamá, aniversario, SOAT..." : "Arriendo, plan celular, seguro de la moto..."}
        maxLength={80}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {unico ? (
          <Campo
            etiqueta="Fecha"
            type="date"
            value={fecha}
            min={r ? undefined : hoy}
            onChange={(e) => setFecha(e.target.value)}
            ayuda="Solo cuenta en ese mes."
            required
          />
        ) : (
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
        )}
        <CampoDinero
          etiqueta={unico ? "Cuánto piensas gastar" : "Monto estimado"}
          valor={monto}
          onCambio={setMonto}
          ayuda="Sin monto, lo libre no puede descontarlo."
        />
      </div>
      {!unico && (
        <Campo
          etiqueta="Empieza en"
          type="month"
          value={desde}
          min={r ? undefined : hoy.slice(0, 7)}
          onChange={(e) => setDesdeElegido(e.target.value)}
          ayuda={
            yaPasoEsteMes && desde > hoy.slice(0, 7)
              ? `El día ${Number(dia)} de ${nombreMes(hoy.slice(0, 7))} ya pasó, así que cuenta desde ${nombreMes(desde)}. Si aún no lo pagas este mes, elige ${nombreMes(hoy.slice(0, 7))}.`
              : "Antes de ese mes no se marca como vencido ni descuenta de lo libre."
          }
        />
      )}
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
        {r ? "Guardar cambios" : unico ? "Programar gasto" : "Crear pago fijo"}
      </Boton>
    </form>
  );
}

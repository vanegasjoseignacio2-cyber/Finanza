"use client";

import { Link2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useDatos } from "@/components/datos-panel";
import { useAvisos } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Modal } from "@/components/ui/modal";
import { Segmentado } from "@/components/ui/segmentado";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import { hoyISO } from "@/lib/fechas";
import type { Movimiento, TipoMovimiento } from "@/lib/types";

/** Lo que se precarga al abrir: vacío (nuevo), un movimiento (editar) o una copia (repetir). */
export interface Borrador {
  id?: string;
  tipo?: TipoMovimiento;
  categoria?: string;
  monto?: number | null;
  fecha?: string;
  nota?: string;
  cuentaId?: string | null;
  cuentaDestinoId?: string | null;
  metaId?: string | null;
  recurrenteId?: string | null;
}

interface Captura {
  abrir: (borrador?: Borrador) => void;
  editar: (movimiento: Movimiento) => void;
  repetir: (movimiento: Movimiento) => void;
}

const Contexto = createContext<Captura | null>(null);

const CLAVE_ULTIMO = "finanza:ultimo";

interface Ultimo {
  tipo?: TipoMovimiento;
  categoria?: string;
  cuentaId?: string;
}

// La última elección se recuerda solo como comodidad: si el almacenamiento no
// está disponible (modo privado), el formulario funciona igual.
function leerUltimo(): Ultimo {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ULTIMO) ?? "{}") as Ultimo;
  } catch {
    return {};
  }
}

function guardarUltimo(ultimo: Ultimo) {
  try {
    localStorage.setItem(CLAVE_ULTIMO, JSON.stringify(ultimo));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function ProveedorCaptura({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [estado, setEstado] = useState<{ abierto: boolean; borrador: Borrador; vuelta: number }>({
    abierto: false,
    borrador: {},
    vuelta: 0,
  });

  const abrir = useCallback((borrador: Borrador = {}) => {
    setEstado((e) => ({ abierto: true, borrador, vuelta: e.vuelta + 1 }));
  }, []);

  const valor = useMemo<Captura>(
    () => ({
      abrir,
      editar: (m) => abrir({ ...m }),
      repetir: (m) => abrir({ ...m, id: undefined, fecha: hoyISO(), recurrenteId: null }),
    }),
    [abrir],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <Modal
        abierto={estado.abierto}
        onCerrar={() => setEstado((e) => ({ ...e, abierto: false }))}
        titulo={estado.borrador.id ? "Editar movimiento" : "Nuevo movimiento"}
        descripcion={
          estado.borrador.id
            ? "Los cambios se reflejan al instante en todas las cifras."
            : "Queda guardado al instante y las cifras se recalculan solas."
        }
      >
        <FormularioMovimiento
          key={estado.vuelta}
          borrador={estado.borrador}
          onListo={() => {
            setEstado((e) => ({ ...e, abierto: false }));
            router.refresh();
          }}
        />
      </Modal>
    </Contexto.Provider>
  );
}

export function useCaptura(): Captura {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useCaptura debe usarse dentro de <ProveedorCaptura>.");
  return valor;
}

const TIPOS: { valor: TipoMovimiento; etiqueta: string }[] = [
  { valor: "gasto", etiqueta: "Gasto" },
  { valor: "ingreso", etiqueta: "Ingreso" },
  { valor: "ahorro", etiqueta: "Aporte" },
  { valor: "retiro", etiqueta: "Retiro" },
  { valor: "transferencia", etiqueta: "Transferir" },
];

const AYUDA_TIPO: Record<TipoMovimiento, string> = {
  gasto: "Sale plata de una de tus cuentas.",
  ingreso: "Entra plata. El sueldo registrado reemplaza al esperado del mes.",
  ahorro: "Apartas plata para una meta; deja de estar libre este mes.",
  retiro: "Sacas plata de una meta; vuelve a estar libre este mes.",
  transferencia: "Mueves plata entre tus cuentas. No cuenta como gasto ni ingreso.",
};

export function FormularioMovimiento({ borrador, onListo }: { borrador: Borrador; onListo: () => void }) {
  const { catalogo, cuentas, metas, pendientes } = useDatos();
  const avisos = useAvisos();
  const editando = Boolean(borrador.id);

  // Lo nuevo arranca con la última elección; lo editado, con lo que ya tenía.
  const [ultimo] = useState<Ultimo>(() => (editando || borrador.tipo ? {} : leerUltimo()));
  const cuentasActivas = cuentas.filter((c) => !c.archivada);
  const metasActivas = metas.filter((m) => !m.archivada);

  const [tipo, setTipo] = useState<TipoMovimiento>(borrador.tipo ?? ultimo.tipo ?? "gasto");
  const [categoria, setCategoria] = useState<string>(
    borrador.categoria ??
      (ultimo.categoria && catalogo.existe(ultimo.categoria) ? ultimo.categoria : "mercado"),
  );
  const [monto, setMonto] = useState<number | null>(borrador.monto ?? null);
  const [fecha, setFecha] = useState(borrador.fecha ?? hoyISO());
  const [nota, setNota] = useState(borrador.nota ?? "");
  const [cuentaId, setCuentaId] = useState(
    borrador.cuentaId ??
      (ultimo.cuentaId && cuentasActivas.some((c) => c.id === ultimo.cuentaId)
        ? ultimo.cuentaId
        : (cuentasActivas[0]?.id ?? "")),
  );
  const [cuentaDestinoId, setCuentaDestinoId] = useState(
    borrador.cuentaDestinoId ?? cuentasActivas.find((c) => c.id !== cuentaId)?.id ?? "",
  );
  const [metaId, setMetaId] = useState(borrador.metaId ?? metasActivas[0]?.id ?? "");
  const [recurrenteId, setRecurrenteId] = useState(borrador.recurrenteId ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  // Si al cambiar de tipo la categoría deja de valer, se toma la primera válida.
  const categoriasDelTipo = tipo === "ingreso" ? catalogo.ingreso : catalogo.gasto;
  const categoriaValida = categoriasDelTipo.some((c) => c.id === categoria);
  const categoriaEfectiva = categoriaValida
    ? categoria
    : tipo === "ingreso"
      ? "sueldo"
      : (catalogo.gasto[0]?.id ?? "otros");

  // Pagos fijos que este gasto podría estar pagando.
  const vinculables = pendientes.filter((r) => r.activo && (!r.pagado || r.id === borrador.recurrenteId));
  const sugerido = vinculables.find((r) => r.categoria && r.categoria === categoriaEfectiva);

  function elegirPagoFijo(id: string) {
    setRecurrenteId(id);
    const r = vinculables.find((x) => x.id === id);
    if (!r) return;
    if (r.categoria) setCategoria(r.categoria);
    if (!monto && r.montoEstimado > 0) setMonto(r.montoEstimado);
    if (!nota) setNota(r.titulo);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!monto || monto <= 0) {
      setError("Escribe un monto mayor que cero.");
      return;
    }
    setGuardando(true);
    setError("");
    const cuerpo = {
      tipo,
      categoria: categoriaEfectiva,
      monto,
      fecha,
      nota,
      cuentaId,
      cuentaDestinoId: tipo === "transferencia" ? cuentaDestinoId : null,
      metaId: tipo === "ahorro" || tipo === "retiro" ? metaId : null,
      recurrenteId: tipo === "gasto" && recurrenteId ? recurrenteId : null,
    };
    try {
      await peticion(editando ? `/api/movimientos/${borrador.id}` : "/api/movimientos", {
        method: editando ? "PUT" : "POST",
        body: JSON.stringify(cuerpo),
      });
      if (!editando) guardarUltimo({ tipo, categoria: categoriaEfectiva, cuentaId });
      avisos.exito(editando ? "Movimiento actualizado." : "Movimiento registrado.");
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar el movimiento.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    setGuardando(true);
    try {
      await peticion(`/api/movimientos/${borrador.id}`, { method: "DELETE" });
      avisos.exito("Movimiento eliminado.");
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos eliminar el movimiento.");
      setGuardando(false);
    }
  }

  const sinMetas = (tipo === "ahorro" || tipo === "retiro") && metasActivas.length === 0;
  const sinCuentas = tipo === "transferencia" && cuentasActivas.length < 2;
  const bloqueado = sinMetas || sinCuentas;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div>
        <Segmentado
          etiqueta="Tipo"
          opciones={TIPOS}
          valor={tipo}
          onCambio={setTipo}
          columnas="grid-cols-2 sm:grid-cols-5"
        />
        <p className="mt-1.5 text-[12.5px] text-tinta-3">{AYUDA_TIPO[tipo]}</p>
      </div>

      {sinMetas && (
        <p className="rounded-xl border border-borde-suave bg-fondo-alto p-3 text-[13.5px] text-tinta-2">
          Todavía no tienes metas. Créala en la sección Metas y vuelve aquí.
        </p>
      )}
      {sinCuentas && (
        <p className="rounded-xl border border-borde-suave bg-fondo-alto p-3 text-[13.5px] text-tinta-2">
          Para transferir necesitas al menos dos cuentas. Agrégalas en Ajustes.
        </p>
      )}

      {(tipo === "gasto" || tipo === "ingreso") && (
        <Selector
          etiqueta="Categoría"
          value={categoriaEfectiva}
          onChange={(e) => setCategoria(e.target.value)}
          required
        >
          {categoriasDelTipo.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Selector>
      )}

      {(tipo === "ahorro" || tipo === "retiro") && metasActivas.length > 0 && (
        <Selector etiqueta="Meta" value={metaId} onChange={(e) => setMetaId(e.target.value)} required>
          {metasActivas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </Selector>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoDinero
          etiqueta="Monto"
          valor={monto}
          onCambio={setMonto}
          requerido
          autoFocus={!editando}
          error={error && !monto ? error : undefined}
        />
        <Campo
          etiqueta="Fecha"
          type="date"
          value={fecha}
          max="2100-12-31"
          onChange={(e) => setFecha(e.target.value)}
          required
        />
      </div>

      {tipo === "transferencia" ? (
        cuentasActivas.length >= 2 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Selector etiqueta="Desde" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
              {cuentasActivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Selector>
            <Selector
              etiqueta="Hacia"
              value={cuentaDestinoId}
              onChange={(e) => setCuentaDestinoId(e.target.value)}
            >
              {cuentasActivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Selector>
          </div>
        )
      ) : (
        cuentasActivas.length > 1 && (
          <Selector
            etiqueta={tipo === "ingreso" || tipo === "retiro" ? "Entra a" : "Sale de"}
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
          >
            {cuentasActivas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
        )
      )}

      {tipo === "gasto" && vinculables.length > 0 && (
        <div>
          <Selector
            etiqueta="¿Es un pago fijo?"
            value={recurrenteId}
            onChange={(e) => elegirPagoFijo(e.target.value)}
            ayuda="Vincularlo lo marca como pagado y evita contarlo dos veces en lo libre."
          >
            <option value="">No, es un gasto suelto</option>
            {vinculables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.titulo}
                {r.montoEstimado > 0 ? ` · ${pesos(r.montoEstimado)}` : ""}
              </option>
            ))}
          </Selector>
          {!recurrenteId && sugerido && (
            <button
              type="button"
              onClick={() => elegirPagoFijo(sugerido.id)}
              className="area-toque mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg text-[12.5px] text-verde hover:underline"
            >
              <Link2 className="size-3.5" aria-hidden="true" />
              ¿Es el pago de «{sugerido.titulo}»? Vincúlalo
            </button>
          )}
        </div>
      )}

      <Campo
        etiqueta="Nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        maxLength={160}
        placeholder="Opcional: domicilio, taller de la moto..."
      />

      {error && monto ? (
        <p role="alert" className="text-[13px] text-alerta">
          {error}
        </p>
      ) : null}

      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        {editando &&
          (confirmandoBorrado ? (
            <span className="flex items-center gap-2 sm:mr-auto">
              <Boton type="button" variante="peligro" tamano="sm" cargando={guardando} onClick={borrar}>
                Sí, eliminar
              </Boton>
              <Boton type="button" variante="fantasma" tamano="sm" onClick={() => setConfirmandoBorrado(false)}>
                No
              </Boton>
            </span>
          ) : (
            <Boton
              type="button"
              variante="fantasma"
              tamano="sm"
              className="sm:mr-auto"
              onClick={() => setConfirmandoBorrado(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Eliminar
            </Boton>
          ))}
        <Boton type="submit" cargando={guardando} disabled={bloqueado} className="sm:ml-auto">
          {editando ? "Guardar cambios" : "Guardar"}
        </Boton>
      </div>
    </form>
  );
}

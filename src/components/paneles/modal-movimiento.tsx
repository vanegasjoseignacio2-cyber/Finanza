"use client";

import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo, Selector } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Modal } from "@/components/ui/modal";
import { useAvisos } from "@/components/ui/avisos";
import { CATEGORIAS_GASTO } from "@/lib/categorias";
import { peticion } from "@/lib/cliente";
import { hoyISO } from "@/lib/fechas";
import type { Movimiento, TipoMovimiento } from "@/lib/types";

const TIPOS: { id: TipoMovimiento; etiqueta: string; descripcion: string }[] = [
  { id: "gasto", etiqueta: "Gasto", descripcion: "Sale plata de tu mes." },
  { id: "ahorro", etiqueta: "Ahorro", descripcion: "Suma a tu meta y se descuenta de lo disponible." },
  { id: "ingreso", etiqueta: "Ingreso extra", descripcion: "Se suma a tu ingreso de este mes." },
];

export function ModalMovimiento({
  abierto,
  onCerrar,
  onGuardado,
  tipoInicial = "gasto",
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: (movimiento: Movimiento) => void;
  tipoInicial?: TipoMovimiento;
}) {
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nuevo movimiento"
      descripcion="Queda guardado al instante y el panel se actualiza solo."
    >
      {/* El formulario solo se monta con el modal abierto: al cerrarlo se
          desmonta y el estado vuelve a cero sin efectos que lo reinicien. */}
      <Formulario tipoInicial={tipoInicial} onCerrar={onCerrar} onGuardado={onGuardado} />
    </Modal>
  );
}

function Formulario({
  tipoInicial,
  onCerrar,
  onGuardado,
}: {
  tipoInicial: TipoMovimiento;
  onCerrar: () => void;
  onGuardado: (movimiento: Movimiento) => void;
}) {
  const avisos = useAvisos();
  const [tipo, setTipo] = useState<TipoMovimiento>(tipoInicial);
  const [categoria, setCategoria] = useState("mercado");
  const [monto, setMonto] = useState<number | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!monto || monto <= 0) {
      setError("Escribe un monto mayor que cero.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const { movimiento } = await peticion<{ movimiento: Movimiento }>("/api/movimientos", {
        method: "POST",
        body: JSON.stringify({ tipo, categoria, monto, fecha, nota }),
      });
      avisos.exito(
        tipo === "gasto"
          ? "Gasto registrado."
          : tipo === "ahorro"
            ? "Aporte sumado a tu meta."
            : "Ingreso extra registrado.",
      );
      onGuardado(movimiento);
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar el movimiento.");
    } finally {
      setGuardando(false);
    }
  }

  const descripcionTipo = TIPOS.find((t) => t.id === tipo)?.descripcion ?? "";

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-tinta-2">Tipo</span>
        <div
          role="radiogroup"
          aria-label="Tipo de movimiento"
          className="grid grid-cols-3 gap-1 rounded-xl border border-borde-suave bg-fondo-alto/70 p-1"
        >
          {TIPOS.map((opcion) => {
            const activo = tipo === opcion.id;
            return (
              <button
                key={opcion.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setTipo(opcion.id)}
                className={`relative min-h-10 cursor-pointer rounded-lg px-2 text-[13px] font-medium transition-colors ${
                  activo ? "text-[#04121c]" : "text-tinta-3 hover:text-tinta-2"
                }`}
              >
                {activo && (
                  <motion.span
                    layoutId="tipo-activo"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg degradado-marca"
                  />
                )}
                <span className="relative">{opcion.etiqueta}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[12.5px] text-tinta-3">{descripcionTipo}</p>
      </div>

      {tipo === "gasto" && (
        <Selector
          etiqueta="Categoría"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          required
        >
          {CATEGORIAS_GASTO.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
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

      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={guardando}>
          Guardar movimiento
        </Boton>
      </div>
    </form>
  );
}

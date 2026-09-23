"use client";

import { motion } from "framer-motion";
import { Archive, ArrowDownToLine, Pencil, PiggyBank, Plus, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCaptura } from "@/components/captura";
import { useDatos } from "@/components/datos-panel";
import { Barra } from "@/components/paneles/barra";
import { useAvisos } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { Cabecera } from "@/components/ui/cabecera";
import { Campo, Selector } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Modal } from "@/components/ui/modal";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import { fechaLarga, mesActual, nombreMes, sumarMeses } from "@/lib/fechas";
import type { Meta, MetaCalculada, Resumen } from "@/lib/types";

function TarjetaMeta({ m, indice, onEditar }: { m: MetaCalculada; indice: number; onEditar: () => void }) {
  const router = useRouter();
  const avisos = useAvisos();
  const captura = useCaptura();
  const { cuentas } = useDatos();
  const [archivando, setArchivando] = useState<"confirmar" | "enviando" | null>(null);
  const cuenta = cuentas.find((c) => c.id === m.cuentaId);
  const cumplida = m.progreso >= 100;
  const alcanza = m.cuotaSugerida !== null && m.promedioMensual >= m.cuotaSugerida;

  async function archivar() {
    setArchivando("enviando");
    try {
      await peticion(`/api/metas/${m.id}`, { method: "PATCH", body: JSON.stringify({ archivada: true }) });
      avisos.exito(`${m.nombre} archivada. Sus movimientos se conservan.`);
      router.refresh();
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos archivarla.");
      setArchivando(null);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * indice, ease: [0.22, 1, 0.36, 1] }}
      className="tarjeta flex flex-col gap-4 p-5 sm:p-6"
      aria-labelledby={`meta-${m.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`meta-${m.id}`} className="font-display text-[18px] font-semibold text-tinta">
            {m.nombre}
          </h2>
          {cuenta && <p className="text-[12.5px] text-tinta-3">En {cuenta.nombre}</p>}
        </div>
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Editar ${m.nombre}`}
          className="area-toque grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-tinta-3 hover:bg-superficie-alta hover:text-tinta"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-[30px] leading-none font-semibold tabular text-tinta">{m.progreso}%</span>
          <span className="text-[13px] tabular text-tinta-2">
            {pesos(m.ahorrado)} <span className="text-tinta-3">de {pesos(m.monto)}</span>
          </span>
        </div>
        <Barra porcentaje={m.progreso} etiqueta={`${m.nombre}: ${m.progreso}%`} alto="h-2.5" />
      </div>

      <dl className="grid grid-cols-1 gap-2 text-[13.5px]">
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-3">Este mes</dt>
          <dd className="tabular text-tinta-2">{pesos(m.aportadoEsteMes)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-tinta-3">Ritmo real</dt>
          <dd className="tabular text-tinta-2">{m.promedioMensual > 0 ? `${pesos(m.promedioMensual)} al mes` : "sin aportes aún"}</dd>
        </div>
      </dl>

      <p className="rounded-xl bg-fondo-alto px-3.5 py-3 text-[13.5px] leading-relaxed text-tinta-2">
        {cumplida
          ? "Meta cumplida. Archívala o súbele el monto si quieres seguir."
          : m.cuotaSugerida !== null && m.fechaLimite
            ? m.mesesHastaLimite === 0
              ? `La fecha límite (${fechaLarga(m.fechaLimite)}) ya pasó: faltan ${pesos(m.monto - m.ahorrado)}. Pon una fecha nueva.`
              : `Para el ${fechaLarga(m.fechaLimite)} necesitas ${pesos(m.cuotaSugerida)} al mes. ${
                  alcanza ? "Tu ritmo alcanza." : "A tu ritmo actual no alcanza."
                }`
            : m.mesesRestantes
              ? `A tu ritmo llegas hacia ${nombreMes(sumarMeses(mesActual(), m.mesesRestantes))} (unos ${m.mesesRestantes} meses). Ponle fecha límite para saber cuánto apartar.`
              : "Haz el primer aporte y ponle fecha límite: así sabrás cuánto apartar cada mes."}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Boton tamano="sm" onClick={() => captura.abrir({ tipo: "ahorro", metaId: m.id, monto: m.cuotaSugerida ?? null })}>
          <PiggyBank className="size-4" aria-hidden="true" />
          Aportar
        </Boton>
        <Boton
          tamano="sm"
          variante="secundario"
          disabled={m.ahorrado <= 0}
          onClick={() => captura.abrir({ tipo: "retiro", metaId: m.id })}
        >
          <ArrowDownToLine className="size-4" aria-hidden="true" />
          Retirar
        </Boton>
        {archivando === "confirmar" || archivando === "enviando" ? (
          <span className="ml-auto flex items-center gap-1">
            <Boton tamano="sm" variante="peligro" cargando={archivando === "enviando"} onClick={archivar}>
              Archivar
            </Boton>
            <Boton tamano="sm" variante="fantasma" onClick={() => setArchivando(null)}>
              No
            </Boton>
          </span>
        ) : (
          <Boton tamano="sm" variante="fantasma" className="ml-auto" onClick={() => setArchivando("confirmar")}>
            <Archive className="size-4" aria-hidden="true" />
            Archivar
          </Boton>
        )}
      </div>
    </motion.article>
  );
}

export function VistaMetas({ resumen: r, archivadas }: { resumen: Resumen; archivadas: Meta[] }) {
  const router = useRouter();
  const avisos = useAvisos();
  const [editando, setEditando] = useState<Meta | "nueva" | null>(null);
  const aportadoMes = r.metas.reduce((s, m) => s + Math.max(0, m.aportadoEsteMes), 0);

  async function restaurar(m: Meta) {
    try {
      await peticion(`/api/metas/${m.id}`, { method: "PATCH", body: JSON.stringify({ archivada: false }) });
      avisos.exito(`${m.nombre} vuelve a estar activa.`);
      router.refresh();
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos restaurarla.");
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Cabecera
        titulo="Metas"
        subtitulo="Lo que estás juntando, a qué ritmo real y cuánto falta."
        acciones={
          <Boton onClick={() => setEditando("nueva")}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva meta
          </Boton>
        }
      />

      {r.cuotaMetasPendiente > 0 && (
        <p className="tarjeta px-5 py-4 text-[14px] leading-relaxed text-tinta-2">
          Este mes tus metas con fecha piden{" "}
          <span className="font-semibold tabular text-tinta">{pesos(r.cuotaMetasPendiente + aportadoMes)}</span>. Ya
          apartaste <span className="font-semibold tabular text-verde">{pesos(aportadoMes)}</span>; faltan{" "}
          <span className="font-semibold tabular text-tinta">{pesos(r.cuotaMetasPendiente)}</span>.
        </p>
      )}

      {r.metas.length === 0 ? (
        <Tarjeta>
          <Vacio mensaje="Sin metas activas. Una meta con monto y fecha convierte 'ahorrar' en una cifra mensual concreta.">
            <Boton tamano="sm" variante="secundario" onClick={() => setEditando("nueva")}>
              Crear la primera meta
            </Boton>
          </Vacio>
        </Tarjeta>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {r.metas.map((m, i) => (
            <TarjetaMeta key={m.id} m={m} indice={i} onEditar={() => setEditando(m)} />
          ))}
        </div>
      )}

      {archivadas.length > 0 && (
        <Tarjeta titulo="Archivadas">
          <ul className="flex flex-col">
            {archivadas.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 border-b border-borde-suave py-2 last:border-b-0">
                <span className="text-[14px] text-tinta-2">{m.nombre}</span>
                <Boton tamano="sm" variante="fantasma" onClick={() => restaurar(m)}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Restaurar
                </Boton>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Modal
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nueva" ? "Nueva meta" : "Editar meta"}
        descripcion="Con fecha límite calculamos cuánto apartar cada mes."
      >
        {editando !== null && (
          <FormularioMeta
            key={editando === "nueva" ? "nueva" : editando.id}
            meta={editando === "nueva" ? null : editando}
            onListo={() => setEditando(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function FormularioMeta({ meta, onListo }: { meta: Meta | null; onListo: () => void }) {
  const router = useRouter();
  const avisos = useAvisos();
  const { cuentas } = useDatos();
  const [nombre, setNombre] = useState(meta?.nombre ?? "");
  const [monto, setMonto] = useState<number | null>(meta?.monto ?? null);
  const [fechaLimite, setFechaLimite] = useState(meta?.fechaLimite ?? "");
  const [cuentaId, setCuentaId] = useState(meta?.cuentaId ?? "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!nombre.trim()) return setError("Ponle un nombre.");
    if (!monto) return setError("Escribe cuánto quieres juntar.");
    setGuardando(true);
    setError("");
    try {
      await peticion(meta ? `/api/metas/${meta.id}` : "/api/metas", {
        method: meta ? "PATCH" : "POST",
        body: JSON.stringify({ nombre, monto, fechaLimite: fechaLimite || null, cuentaId: cuentaId || null }),
      });
      avisos.exito(meta ? "Meta actualizada." : "Meta creada.");
      router.refresh();
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la meta.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Moto nueva, fondo de emergencia, viaje..."
        maxLength={60}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoDinero etiqueta="Monto" valor={monto} onCambio={setMonto} requerido />
        <Campo
          etiqueta="Fecha límite"
          type="date"
          value={fechaLimite}
          onChange={(e) => setFechaLimite(e.target.value)}
          ayuda="Opcional, pero recomendada."
        />
      </div>
      <Selector
        etiqueta="¿Dónde guardas esta plata?"
        value={cuentaId}
        onChange={(e) => setCuentaId(e.target.value)}
        ayuda="Si eliges una cuenta, cada aporte suma a su saldo."
      >
        <option value="">Sin cuenta específica</option>
        {cuentas
          .filter((c) => !c.archivada)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
      </Selector>
      {error && (
        <p role="alert" className="text-[13px] text-alerta">
          {error}
        </p>
      )}
      <Boton type="submit" cargando={guardando} className="self-end">
        {meta ? "Guardar cambios" : "Crear meta"}
      </Boton>
    </form>
  );
}

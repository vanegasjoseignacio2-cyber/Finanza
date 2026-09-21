"use client";

import { BellRing, Mail, Plus } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { ListaRecordatorios } from "@/components/paneles/lista-recordatorios";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { useAvisos } from "@/components/ui/avisos";
import { Campo, Selector } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Modal } from "@/components/ui/modal";
import { Tarjeta } from "@/components/ui/tarjeta";
import { CATEGORIAS_GASTO } from "@/lib/categorias";
import { peticion } from "@/lib/cliente";
import type { Ajustes, RecordatorioCalculado } from "@/lib/types";

export function VistaRecordatorios({
  inicial,
  ajustes,
}: {
  inicial: RecordatorioCalculado[];
  ajustes: Ajustes;
}) {
  const avisos = useAvisos();
  const [recordatorios, setRecordatorios] = useState(inicial);
  const [modal, setModal] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [dia, setDia] = useState("5");
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const datos = await peticion<{ recordatorios: RecordatorioCalculado[] }>(
        "/api/recordatorios",
      );
      setRecordatorios(datos.recordatorios);
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos cargar los recordatorios.");
    }
  }, [avisos]);

  async function crear(evento: FormEvent) {
    evento.preventDefault();
    const diaNumero = Number(dia);
    if (!titulo.trim()) {
      setError("Ponle un nombre al recordatorio.");
      return;
    }
    if (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > 31) {
      setError("El día debe estar entre 1 y 31.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await peticion("/api/recordatorios", {
        method: "POST",
        body: JSON.stringify({
          titulo,
          dia: diaNumero,
          categoria,
          montoEstimado: monto ?? 0,
        }),
      });
      avisos.exito("Recordatorio creado.");
      setModal(false);
      setTitulo("");
      setMonto(null);
      setCategoria("");
      setDia("5");
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear el recordatorio.");
    } finally {
      setGuardando(false);
    }
  }

  const activos = recordatorios.filter((r) => r.activo);
  const pendientes = activos.filter((r) => !r.pagado);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-[26px] leading-tight font-semibold text-tinta sm:text-3xl">
            Recordatorios
          </h1>
          <p className="mt-1 text-[14px] text-tinta-3">
            Pagos que se repiten cada mes. El correo diario te avisa antes de que
            venzan.
          </p>
        </div>
        <Boton onClick={() => setModal(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo recordatorio
        </Boton>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tarjeta className="lg:col-span-2" titulo={`${recordatorios.length} en total`}>
          <ListaRecordatorios
            recordatorios={recordatorios}
            onCambio={recargar}
            conAcciones
          />
        </Tarjeta>

        <div className="flex flex-col gap-4">
          <Tarjeta titulo="Estado" retraso={0.05}>
            <dl className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[13.5px] text-tinta-3">Pendientes este mes</dt>
                <dd className="text-[15px] font-semibold tabular text-tinta">
                  {pendientes.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[13.5px] text-tinta-3">Con avisos activos</dt>
                <dd className="text-[15px] font-semibold tabular text-tinta">
                  {activos.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[13.5px] text-tinta-3">Aviso anticipado</dt>
                <dd className="text-[15px] font-semibold tabular text-tinta">
                  {ajustes.diasAviso} {ajustes.diasAviso === 1 ? "día" : "días"}
                </dd>
              </div>
            </dl>
          </Tarjeta>

          <Tarjeta titulo="Correo diario" retraso={0.1}>
            <div className="flex flex-col gap-3">
              <p className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-tinta-2">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-verde/12 text-verde">
                  {ajustes.emailActivo ? (
                    <BellRing className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Mail className="size-3.5" aria-hidden="true" />
                  )}
                </span>
                {ajustes.emailActivo && ajustes.email
                  ? `Cada día se envía un aviso a ${ajustes.email} con lo que vence dentro de ${ajustes.diasAviso} ${ajustes.diasAviso === 1 ? "día" : "días"}.`
                  : "El correo diario está apagado. Actívalo para que te avise antes de cada pago."}
              </p>
              <BotonEnlace href="/ajustes" variante="secundario" tamano="sm" ancho>
                Configurar correo
              </BotonEnlace>
            </div>
          </Tarjeta>
        </div>
      </div>

      <Modal
        abierto={modal}
        onCerrar={() => setModal(false)}
        titulo="Nuevo recordatorio"
        descripcion="Se repite todos los meses el día que elijas."
      >
        <form onSubmit={crear} className="flex flex-col gap-4">
          <Campo
            etiqueta="Nombre"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Arriendo, seguro de la moto, plan celular..."
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
              ayuda="Opcional, aparece en el correo."
            />
          </div>
          <Selector
            etiqueta="Categoría"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            ayuda="Si eliges una, el pago se marca solo cuando registres un gasto de esa categoría."
          >
            <option value="">Sin categoría</option>
            {CATEGORIAS_GASTO.map((c) => (
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

          <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Boton type="button" variante="secundario" onClick={() => setModal(false)}>
              Cancelar
            </Boton>
            <Boton type="submit" cargando={guardando}>
              Crear recordatorio
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
}

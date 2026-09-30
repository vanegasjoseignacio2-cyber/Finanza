"use client";

import { Check, ImagePlus, Link2, Sparkles } from "lucide-react";
import { type DragEvent, type FormEvent, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { Confirmar } from "@/components/ui/confirmar";
import { Modal } from "@/components/ui/modal";
import { Segmentado } from "@/components/ui/segmentado";
import { peticion } from "@/lib/cliente";
import { MESES } from "@/lib/fechas";
import type { Portadas } from "@/lib/types";
import { prepararFoto, probarEnlace } from "./imagen";
import { aspectoPortada, FONDOS, FotoPortada } from "./portada";

type Alcance = "mes" | "todos";
type Ocupado = "foto" | "enlace" | "fondo" | "quitar" | null;

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-tinta-3 uppercase">{children}</h3>;
}

export function PersonalizarPortada({
  abierto,
  mes,
  portadas,
  onCerrar,
  onCambio,
}: {
  abierto: boolean;
  mes: string;
  portadas: Portadas;
  onCerrar: () => void;
  onCambio: (portadas: Portadas) => void;
}) {
  const [alcance, setAlcance] = useState<Alcance>("mes");
  const [enlace, setEnlace] = useState("");
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const nombre = MESES[Number(mes.slice(5, 7)) - 1];
  const clave = alcance === "mes" ? mes : "todos";
  const actual = portadas[clave];
  const aspecto = aspectoPortada(portadas, mes);
  const origen = portadas[mes] ? "Portada propia de este mes" : portadas.todos ? "Portada general" : "Fondo automático";

  async function ejecutar(que: Exclude<Ocupado, null>, accion: () => Promise<{ portadas: Portadas }>) {
    setOcupado(que);
    setError(null);
    try {
      onCambio((await accion()).portadas);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la portada.");
      return false;
    } finally {
      setOcupado(null);
    }
  }

  const guardar = (cuerpo: object) =>
    peticion<{ portadas: Portadas }>(`/api/portadas/${clave}`, { method: "PUT", body: JSON.stringify(cuerpo) });

  const subirFoto = (archivo: File | undefined) => {
    if (!archivo || ocupado) return;
    void ejecutar("foto", async () => {
      const foto = await prepararFoto(archivo);
      return peticion(`/api/portadas/${clave}`, { method: "POST", body: foto, headers: { "content-type": "image/jpeg" } });
    });
  };

  const usarEnlace = async (e: FormEvent) => {
    e.preventDefault();
    const url = enlace.trim();
    if (!url || ocupado) return;
    const ok = await ejecutar("enlace", async () => {
      await probarEnlace(url);
      return guardar({ tipo: "enlace", url });
    });
    if (ok) setEnlace("");
  };

  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    subirFoto(e.dataTransfer.files[0]);
  };

  const elegidoFondo = (i: number | "auto") =>
    i === "auto" ? (actual ? actual.tipo === "auto" : alcance === "todos") : actual?.tipo === "fondo" && actual.fondo === i;

  return (
    <Modal
      abierto={abierto}
      titulo="Personalizar portada"
      descripcion="Pon una foto de tu galería, el enlace de una imagen o uno de los fondos."
      onCerrar={onCerrar}
    >
      <div className="flex flex-col gap-5">
        <div>
          <div className="relative h-36 overflow-hidden rounded-xl border border-borde-suave" style={{ background: aspecto.fondo }}>
            {aspecto.imagen && <FotoPortada src={aspecto.imagen} />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />
            <span className="absolute bottom-3 left-3.5 font-display text-[17px] font-semibold text-white capitalize">{nombre}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[12.5px] text-tinta-3">
            <span>{origen}</span>
            {portadas[mes] && portadas.todos && (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                disabled={ocupado !== null}
                className="min-h-11 cursor-pointer text-tinta-2 underline-offset-2 hover:text-tinta hover:underline disabled:opacity-50"
              >
                Usar la general
              </button>
            )}
          </div>
        </div>

        <div>
          <Segmentado<Alcance>
            etiqueta="Aplicar a"
            columnas="grid-cols-2"
            valor={alcance}
            onCambio={setAlcance}
            opciones={[
              { valor: "mes", etiqueta: `Solo ${nombre}` },
              { valor: "todos", etiqueta: "Todos los meses" },
            ]}
          />
          {alcance === "todos" && (
            <p className="mt-1.5 text-[12.5px] text-tinta-3">Reemplaza también la portada propia de cada mes.</p>
          )}
        </div>

        <section>
          <Titulo>Tu foto</Titulo>
          {/* Un <label> que envuelve el input es lo más fiable en iPhone y
              Android: el toque llega directo al input, sin clic programático.
              Sin `capture`, para que el sistema ofrezca galería y cámara. */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
            className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors focus-within:border-acento ${
              arrastrando ? "border-acento bg-white/5" : "border-borde hover:border-tinta-3"
            } ${ocupado ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={ocupado !== null}
              onChange={(e) => {
                subirFoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <ImagePlus className="size-5 text-tinta-2" aria-hidden="true" />
            <span className="text-[14px] font-medium text-tinta">
              {ocupado === "foto" ? "Subiendo foto…" : "Elegir de la galería"}
            </span>
            <span className="text-[12.5px] text-tinta-3">o arrástrala aquí desde el computador</span>
          </label>
        </section>

        <section>
          <Titulo>Enlace de imagen</Titulo>
          <form onSubmit={usarEnlace} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Campo
                etiqueta="Dirección de la imagen"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://…"
                value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
              />
            </div>
            <Boton type="submit" variante="secundario" cargando={ocupado === "enlace"} disabled={!enlace.trim() || ocupado !== null}>
              <Link2 className="size-4" aria-hidden="true" />
              Usar
            </Boton>
          </form>
        </section>

        <section>
          <Titulo>Fondos</Titulo>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            <button
              type="button"
              onClick={() => void ejecutar("fondo", () => guardar({ tipo: "auto" }))}
              disabled={ocupado !== null}
              aria-pressed={elegidoFondo("auto")}
              aria-label="Automático: cambia cada mes"
              title="Automático: cambia cada mes"
              className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-xl border border-borde-suave disabled:opacity-60"
              style={{ background: `conic-gradient(${["#34d399", "#22d3ee", "#fbbf24", "#9ca3af", "#fb7185", "#a7f3d0", "#34d399"].join(",")})` }}
            >
              <span className="grid size-7 place-items-center rounded-full bg-black/60 text-white">
                {elegidoFondo("auto") ? <Check className="size-4" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
              </span>
            </button>
            {FONDOS.map((f, i) => (
              <button
                key={f.nombre}
                type="button"
                onClick={() => void ejecutar("fondo", () => guardar({ tipo: "fondo", fondo: i }))}
                disabled={ocupado !== null}
                aria-pressed={elegidoFondo(i)}
                aria-label={`Fondo ${f.nombre}`}
                title={f.nombre}
                className={`grid aspect-square cursor-pointer place-items-center rounded-xl border disabled:opacity-60 ${
                  elegidoFondo(i) ? "border-acento ring-2 ring-acento/40" : "border-borde-suave"
                }`}
                style={{ background: f.css }}
              >
                {elegidoFondo(i) && <Check className="size-4 text-white drop-shadow" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-xl border border-alerta/40 bg-alerta/10 px-3.5 py-2.5 text-[13px] text-alerta">
            {error}
          </p>
        )}

        <Boton variante="secundario" ancho onClick={onCerrar}>
          Listo
        </Boton>

        <Confirmar
          abierto={confirmando}
          titulo={`¿Quitar la portada de ${nombre}?`}
          descripcion="Este mes vuelve a mostrar la portada general."
          accion="Quitar portada"
          onConfirmar={() => ejecutar("quitar", () => peticion(`/api/portadas/${mes}`, { method: "DELETE" }))}
          onCerrar={() => setConfirmando(false)}
        />
      </div>
    </Modal>
  );
}

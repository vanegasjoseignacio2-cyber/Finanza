"use client";

import {
  Archive,
  CircleAlert,
  CircleCheck,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  MonitorX,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icono } from "@/components/iconos";
import { useAvisos } from "@/components/ui/avisos";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { Campo, Interruptor, Selector } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Modal } from "@/components/ui/modal";
import { Segmentado } from "@/components/ui/segmentado";
import { Tarjeta } from "@/components/ui/tarjeta";
import { ICONOS_DISPONIBLES, type Categoria } from "@/lib/categorias";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import type { DiagnosticoCorreo } from "@/lib/email/estado";
import { fechaCorta, mesActual, nombreMes } from "@/lib/fechas";
import { sueldoPara } from "@/lib/finanzas";
import type { Ajustes, CuentaConSaldo, Envio, TipoCuenta, TramoSueldo } from "@/lib/types";

/** Ejecuta una petición, avisa y refresca los datos del servidor. */
function useAccion() {
  const router = useRouter();
  const avisos = useAvisos();
  const [ocupado, setOcupado] = useState<string | null>(null);
  async function ejecutar(clave: string, accion: () => Promise<unknown>, exito: string): Promise<boolean> {
    setOcupado(clave);
    try {
      await accion();
      avisos.exito(exito);
      router.refresh();
      return true;
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos guardar el cambio.");
      return false;
    } finally {
      setOcupado(null);
    }
  }
  return { ocupado, ejecutar };
}

const botonIcono =
  "area-toque grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-tinta-3 transition-colors hover:bg-superficie-alta hover:text-tinta disabled:opacity-50";

/* ─── Sueldo ─────────────────────────────────────────────────────────────── */

export function SeccionSueldo({ sueldos }: { sueldos: TramoSueldo[] }) {
  const { ocupado, ejecutar } = useAccion();
  const hoy = mesActual();
  const vigente = sueldoPara(sueldos, hoy);
  const [monto, setMonto] = useState<number | null>(vigente || null);
  const [desde, setDesde] = useState(hoy);
  const [error, setError] = useState("");

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (monto === null) return setError("Escribe el sueldo.");
    setError("");
    await ejecutar(
      "guardar",
      () => peticion("/api/ajustes/sueldo", { method: "POST", body: JSON.stringify({ monto, desde }) }),
      `Sueldo de ${pesos(monto)} desde ${nombreMes(desde)}.`,
    );
  }

  return (
    <Tarjeta id="sueldo" titulo="Sueldo" className="scroll-mt-24">
      <p className="text-[13.5px] leading-relaxed text-tinta-3">
        Es lo que la app espera que entre cada mes hasta que registres el sueldo real. Cambiarlo desde un mes{" "}
        <strong className="font-medium text-tinta-2">no altera los meses anteriores</strong>.
      </p>
      <p className="mt-3 font-display text-[26px] font-semibold tabular text-tinta">
        {vigente > 0 ? pesos(vigente) : "Sin definir"}
        {vigente > 0 && <span className="ml-2 text-[14px] font-normal text-tinta-3">al mes</span>}
      </p>

      <form onSubmit={guardar} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <CampoDinero etiqueta="Sueldo mensual" valor={monto} onCambio={setMonto} error={error || undefined} />
        <Campo
          etiqueta="Desde"
          type="month"
          value={desde}
          min="2000-01"
          onChange={(e) => setDesde(e.target.value || hoy)}
          required
        />
        <Boton type="submit" cargando={ocupado === "guardar"}>
          Guardar
        </Boton>
      </form>

      {sueldos.length > 0 && (
        <ul className="mt-5 flex flex-col border-t border-borde-suave pt-3">
          {[...sueldos].reverse().map((t) => (
            <li key={t.desde} className="flex items-center justify-between gap-3 py-1">
              <span className="text-[13.5px] text-tinta-2">
                {t.desde <= "2000-01" ? "Desde siempre" : `Desde ${nombreMes(t.desde)}`}
              </span>
              <span className="ml-auto text-[13.5px] tabular text-tinta">{pesos(t.monto)}</span>
              <button
                type="button"
                className={botonIcono}
                disabled={ocupado === t.desde}
                aria-label={`Quitar el sueldo desde ${nombreMes(t.desde)}`}
                onClick={() =>
                  ejecutar(t.desde, () => peticion(`/api/ajustes/sueldo?desde=${t.desde}`, { method: "DELETE" }), "Tramo quitado.")
                }
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

/* ─── Cuentas ────────────────────────────────────────────────────────────── */

const TIPOS_CUENTA: { valor: TipoCuenta; etiqueta: string }[] = [
  { valor: "corriente", etiqueta: "Banco" },
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "ahorro", etiqueta: "Ahorro" },
];

export function SeccionCuentas({ cuentas }: { cuentas: CuentaConSaldo[] }) {
  const { ocupado, ejecutar } = useAccion();
  const [editando, setEditando] = useState<CuentaConSaldo | "nueva" | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const activas = cuentas.filter((c) => !c.archivada);
  const archivadas = cuentas.filter((c) => c.archivada);

  return (
    <Tarjeta
      titulo="Cuentas"
      accion={
        <Boton tamano="sm" variante="secundario" onClick={() => setEditando("nueva")}>
          <Plus className="size-4" aria-hidden="true" />
          Cuenta
        </Boton>
      }
    >
      <p className="mb-3 text-[13.5px] leading-relaxed text-tinta-3">
        Dónde está tu plata: banco, Nequi, efectivo, ahorro. El saldo es el inicial más todo lo que registras en esa cuenta.
      </p>
      <ul className="flex flex-col">
        {activas.map((c) => (
          <li key={c.id} className="flex items-center gap-2 border-b border-borde-suave py-2.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] text-tinta">{c.nombre}</p>
              <p className="text-[12.5px] text-tinta-3">
                {TIPOS_CUENTA.find((t) => t.valor === c.tipo)?.etiqueta} · inicial {pesos(c.saldoInicial)}
              </p>
            </div>
            <span className={`shrink-0 text-[14.5px] font-semibold tabular ${c.saldo < 0 ? "text-alerta" : "text-tinta"}`}>
              {pesos(c.saldo)}
            </span>
            {confirmando === c.id ? (
              <span className="flex items-center gap-1">
                <Boton
                  tamano="sm"
                  variante="peligro"
                  cargando={ocupado === c.id}
                  onClick={async () => {
                    await ejecutar(
                      c.id,
                      () => peticion(`/api/cuentas/${c.id}`, { method: "PATCH", body: JSON.stringify({ archivada: true }) }),
                      `${c.nombre} archivada.`,
                    );
                    setConfirmando(null);
                  }}
                >
                  Archivar
                </Boton>
                <Boton tamano="sm" variante="fantasma" onClick={() => setConfirmando(null)}>
                  No
                </Boton>
              </span>
            ) : (
              <>
                <button type="button" className={botonIcono} aria-label={`Editar ${c.nombre}`} onClick={() => setEditando(c)}>
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={botonIcono}
                  aria-label={`Archivar ${c.nombre}`}
                  disabled={activas.length === 1}
                  onClick={() => setConfirmando(c.id)}
                >
                  <Archive className="size-4" aria-hidden="true" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {archivadas.length > 0 && (
        <ul className="mt-3 flex flex-col border-t border-borde-suave pt-2">
          {archivadas.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-1">
              <span className="text-[13.5px] text-tinta-3">{c.nombre} (archivada)</span>
              <Boton
                tamano="sm"
                variante="fantasma"
                cargando={ocupado === c.id}
                onClick={() =>
                  ejecutar(
                    c.id,
                    () => peticion(`/api/cuentas/${c.id}`, { method: "PATCH", body: JSON.stringify({ archivada: false }) }),
                    `${c.nombre} restaurada.`,
                  )
                }
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Restaurar
              </Boton>
            </li>
          ))}
        </ul>
      )}

      <Modal
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nueva" ? "Nueva cuenta" : "Editar cuenta"}
      >
        {editando !== null && (
          <FormularioCuenta
            key={editando === "nueva" ? "nueva" : editando.id}
            cuenta={editando === "nueva" ? null : editando}
            onListo={() => setEditando(null)}
          />
        )}
      </Modal>
    </Tarjeta>
  );
}

function FormularioCuenta({ cuenta, onListo }: { cuenta: CuentaConSaldo | null; onListo: () => void }) {
  const { ocupado, ejecutar } = useAccion();
  const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo ?? "corriente");
  const [saldoInicial, setSaldoInicial] = useState<number | null>(cuenta?.saldoInicial ?? null);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const ok = await ejecutar(
      "cuenta",
      () =>
        peticion(cuenta ? `/api/cuentas/${cuenta.id}` : "/api/cuentas", {
          method: cuenta ? "PATCH" : "POST",
          body: JSON.stringify({ nombre, tipo, saldoInicial: saldoInicial ?? 0 }),
        }),
      cuenta ? "Cuenta actualizada." : "Cuenta creada.",
    );
    if (ok) onListo();
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Bancolombia, Nequi, efectivo..."
        maxLength={40}
        required
      />
      <Segmentado etiqueta="Tipo" opciones={TIPOS_CUENTA} valor={tipo} onCambio={setTipo} />
      <CampoDinero
        etiqueta="Saldo inicial"
        valor={saldoInicial}
        onCambio={setSaldoInicial}
        ayuda="Lo que tenía la cuenta antes de empezar a registrar en la app."
      />
      <Boton type="submit" cargando={ocupado === "cuenta"} className="self-end">
        {cuenta ? "Guardar cambios" : "Crear cuenta"}
      </Boton>
    </form>
  );
}

/* ─── Correo diario ──────────────────────────────────────────────────────── */

const ESTADO_ENVIO: Record<Envio["estado"], { texto: string; clase: string }> = {
  enviado: { texto: "Enviado", clase: "text-verde" },
  error: { texto: "Falló", clase: "text-alerta" },
  omitido: { texto: "Sin novedades", clase: "text-tinta-3" },
  enviando: { texto: "Enviando", clase: "text-aviso" },
};

export function SeccionCorreo({
  ajustes,
  envios,
  diagnostico,
}: {
  ajustes: Ajustes;
  envios: Envio[];
  diagnostico: DiagnosticoCorreo;
}) {
  const { ocupado, ejecutar } = useAccion();
  const [email, setEmail] = useState(ajustes.email);
  const [emailActivo, setEmailActivo] = useState(ajustes.emailActivo);
  const [enviarSiempre, setEnviarSiempre] = useState(ajustes.enviarSiempre);
  const [respaldoSemanal, setRespaldoSemanal] = useState(ajustes.respaldoSemanal);
  const [diasAviso, setDiasAviso] = useState(ajustes.diasAviso);
  const listo = diagnostico.credenciales && diagnostico.remitente;

  const checks = [
    {
      ok: diagnostico.credenciales,
      texto: `Proveedor ${diagnostico.proveedor === "resend" ? "Resend" : "SMTP"}`,
      falta: diagnostico.proveedor === "resend" ? "Falta RESEND_API_KEY." : "Faltan SMTP_HOST, SMTP_USER o SMTP_PASS.",
    },
    { ok: diagnostico.remitente, texto: "Remitente", falta: "Falta EMAIL_FROM." },
    { ok: diagnostico.cron, texto: "Disparo diario", falta: "Falta CRON_SECRET: el cron no podrá llamar a la app." },
  ];

  return (
    <Tarjeta titulo="Correo diario">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar(
              "guardar",
              () =>
                peticion("/api/ajustes", {
                  method: "PUT",
                  body: JSON.stringify({ email, emailActivo, enviarSiempre, respaldoSemanal, diasAviso }),
                }),
              "Ajustes del correo guardados.",
            );
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-[13.5px] leading-relaxed text-tinta-3">
            Llega cuando vence un pago, cuando hay una alerta seria o el lunes con el respaldo. Siempre abre con lo que puedes
            gastar por día.
          </p>
          <Campo
            etiqueta="Correo de destino"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@gmail.com"
          />
          <Interruptor etiqueta="Enviar el aviso diario" activo={emailActivo} onCambio={setEmailActivo} />
          <Interruptor
            etiqueta="Enviar aunque no haya novedades"
            descripcion="El resumen te llega todos los días."
            activo={enviarSiempre}
            onCambio={setEnviarSiempre}
          />
          <Interruptor
            etiqueta="Respaldo semanal adjunto"
            descripcion="Cada lunes, con todos tus datos en un archivo."
            activo={respaldoSemanal}
            onCambio={setRespaldoSemanal}
          />
          <Selector etiqueta="Avisar de un pago" value={String(diasAviso)} onChange={(e) => setDiasAviso(Number(e.target.value))}>
            {[0, 1, 2, 3, 5, 7, 10].map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "El mismo día" : `${d} ${d === 1 ? "día" : "días"} antes`}
              </option>
            ))}
          </Selector>
          <div className="flex flex-wrap gap-2">
            <Boton type="submit" cargando={ocupado === "guardar"}>
              Guardar
            </Boton>
            <Boton
              type="button"
              variante="secundario"
              disabled={!listo || !email}
              cargando={ocupado === "prueba"}
              onClick={() =>
                ejecutar(
                  "prueba",
                  () => peticion("/api/correo/prueba", { method: "POST", body: JSON.stringify({ destino: email }) }),
                  `Correo de prueba enviado a ${email}. Revisa también spam.`,
                )
              }
            >
              <Send className="size-4" aria-hidden="true" />
              Enviar prueba
            </Boton>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-[12.5px] font-semibold tracking-wide text-tinta-3 uppercase">Configuración del servidor</h3>
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li key={c.texto} className="flex items-start gap-2.5">
                  {c.ok ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-verde" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-aviso" aria-hidden="true" />
                  )}
                  <span className="text-[13.5px]">
                    <span className="text-tinta">{c.texto}</span>
                    <span className="block text-[12.5px] text-tinta-3">{c.ok ? "Listo" : c.falta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-[12.5px] font-semibold tracking-wide text-tinta-3 uppercase">Últimos días</h3>
            {envios.length === 0 ? (
              <p className="text-[13.5px] text-tinta-3">
                El cron todavía no ha corrido. Cuando lo haga, aquí verás si el correo salió o por qué no.
              </p>
            ) : (
              <ul className="flex flex-col">
                {envios.map((e) => {
                  const est = ESTADO_ENVIO[e.estado];
                  return (
                    <li key={e.fecha} className="flex items-start gap-3 border-b border-borde-suave py-2 last:border-b-0">
                      <span className="w-16 shrink-0 text-[13px] tabular text-tinta-2">{fechaCorta(e.fecha)}</span>
                      <span className="min-w-0 flex-1 text-[13px]">
                        <span className={`font-medium ${est.clase}`}>{est.texto}</span>
                        {(e.error || e.motivo || e.asunto) && (
                          <span className="block truncate text-[12.5px] text-tinta-3" title={e.error || e.motivo || e.asunto}>
                            {e.error || e.motivo || e.asunto}
                          </span>
                        )}
                      </span>
                      {e.respaldo && <span className="shrink-0 text-[11.5px] text-tinta-3">con respaldo</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Tarjeta>
  );
}

/* ─── Categorías ─────────────────────────────────────────────────────────── */

export function SeccionCategorias({ categorias }: { categorias: Categoria[] }) {
  const { ocupado, ejecutar } = useAccion();
  const [editando, setEditando] = useState<Categoria | "nueva" | null>(null);

  const grupo = (tipo: "gasto" | "ingreso", titulo: string) => (
    <div>
      <h3 className="mb-2 text-[12.5px] font-semibold tracking-wide text-tinta-3 uppercase">{titulo}</h3>
      <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {categorias
          .filter((c) => c.tipo === tipo)
          .map((c) => (
            <li key={c.id} className="flex items-center gap-2.5 border-b border-borde-suave py-1.5">
              <Icono nombre={c.icono} className={`size-4 shrink-0 ${c.oculta ? "text-tinta-3/60" : "text-tinta-3"}`} />
              <span className={`min-w-0 flex-1 truncate text-[14px] ${c.oculta ? "text-tinta-3 line-through" : "text-tinta-2"}`}>
                {c.label}
                {c.personal && <span className="ml-2 text-[11.5px] text-tinta-3 no-underline">propia</span>}
              </span>
              <button type="button" className={botonIcono} aria-label={`Editar ${c.label}`} onClick={() => setEditando(c)}>
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={botonIcono}
                disabled={ocupado === c.id || c.id === "sueldo"}
                aria-label={c.oculta ? `Mostrar ${c.label}` : `Ocultar ${c.label}`}
                onClick={() =>
                  ejecutar(
                    c.id,
                    () => peticion(`/api/categorias/${c.id}`, { method: "PATCH", body: JSON.stringify({ oculta: !c.oculta }) }),
                    c.oculta ? `${c.label} vuelve a estar disponible.` : `${c.label} oculta. Sus movimientos se conservan.`,
                  )
                }
              >
                {c.oculta ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );

  return (
    <Tarjeta
      titulo="Categorías"
      accion={
        <Boton tamano="sm" variante="secundario" onClick={() => setEditando("nueva")}>
          <Plus className="size-4" aria-hidden="true" />
          Categoría
        </Boton>
      }
    >
      <div className="flex flex-col gap-5">
        {grupo("gasto", "Gastos")}
        {grupo("ingreso", "Ingresos")}
      </div>
      <Modal
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo={editando === "nueva" ? "Nueva categoría" : "Editar categoría"}
      >
        {editando !== null && (
          <FormularioCategoria
            key={editando === "nueva" ? "nueva" : editando.id}
            categoria={editando === "nueva" ? null : editando}
            onListo={() => setEditando(null)}
          />
        )}
      </Modal>
    </Tarjeta>
  );
}

function FormularioCategoria({ categoria, onListo }: { categoria: Categoria | null; onListo: () => void }) {
  const { ocupado, ejecutar } = useAccion();
  const [label, setLabel] = useState(categoria?.label ?? "");
  const [tipo, setTipo] = useState<"gasto" | "ingreso">(categoria?.tipo === "ingreso" ? "ingreso" : "gasto");
  const [icono, setIcono] = useState(categoria?.icono ?? "Package");

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const ok = await ejecutar(
      "categoria",
      () =>
        peticion(categoria ? `/api/categorias/${categoria.id}` : "/api/categorias", {
          method: categoria ? "PATCH" : "POST",
          body: JSON.stringify(categoria ? { label, icono } : { label, icono, tipo }),
        }),
      categoria ? "Categoría actualizada." : "Categoría creada.",
    );
    if (ok) onListo();
  }

  // Los iconos elegibles, más el actual si es uno de los de fábrica.
  const iconos = Array.from(new Set([...(categoria ? [categoria.icono] : []), ...ICONOS_DISPONIBLES]));

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <Campo etiqueta="Nombre" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} required />
      {!categoria && (
        <Segmentado
          etiqueta="Tipo"
          opciones={[
            { valor: "gasto", etiqueta: "Gasto" },
            { valor: "ingreso", etiqueta: "Ingreso" },
          ]}
          valor={tipo}
          onCambio={setTipo}
          columnas="grid-cols-2"
        />
      )}
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-tinta-2">Icono</legend>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {iconos.map((nombre) => (
            <button
              key={nombre}
              type="button"
              aria-label={nombre}
              aria-pressed={icono === nombre}
              onClick={() => setIcono(nombre)}
              className={`grid aspect-square min-h-11 cursor-pointer place-items-center rounded-lg border transition-colors ${
                icono === nombre ? "border-verde bg-verde/10 text-verde" : "border-borde-suave text-tinta-3 hover:text-tinta"
              }`}
            >
              <Icono nombre={nombre} className="size-4.5" />
            </button>
          ))}
        </div>
      </fieldset>
      <Boton type="submit" cargando={ocupado === "categoria"} className="self-end">
        {categoria ? "Guardar cambios" : "Crear categoría"}
      </Boton>
    </form>
  );
}

/* ─── Seguridad ──────────────────────────────────────────────────────────── */

export function SeccionSeguridad() {
  const router = useRouter();
  const avisos = useAvisos();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState<"clave" | "salir" | "todo" | null>(null);
  const [confirmandoTodo, setConfirmandoTodo] = useState(false);

  async function cambiar(evento: FormEvent) {
    evento.preventDefault();
    if (nueva !== confirmacion) return setError("La confirmación no coincide con la clave nueva.");
    setOcupado("clave");
    setError("");
    try {
      await peticion("/api/seguridad/clave", { method: "POST", body: JSON.stringify({ actual, nueva }) });
      avisos.exito("Clave cambiada. Las demás sesiones se cerraron.");
      setActual("");
      setNueva("");
      setConfirmacion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cambiar la clave.");
    } finally {
      setOcupado(null);
    }
  }

  async function salir(todo: boolean) {
    setOcupado(todo ? "todo" : "salir");
    try {
      await peticion(todo ? "/api/seguridad/cerrar-todo" : "/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (e) {
      avisos.error(e instanceof Error ? e.message : "No pudimos cerrar la sesión.");
      setOcupado(null);
    }
  }

  return (
    <Tarjeta titulo="Seguridad">
      <form onSubmit={cambiar} className="flex flex-col gap-3">
        <Campo
          etiqueta="Clave actual"
          type="password"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Clave nueva"
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            ayuda="Mínimo 10 caracteres."
            required
          />
          <Campo
            etiqueta="Repite la clave nueva"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-[13px] text-alerta">
            {error}
          </p>
        )}
        <Boton type="submit" variante="secundario" cargando={ocupado === "clave"} className="self-start">
          <KeyRound className="size-4" aria-hidden="true" />
          Cambiar clave
        </Boton>
      </form>

      <p className="mt-5 text-[12.5px] leading-relaxed text-tinta-3">
        Tras 5 intentos fallidos seguidos, el acceso se bloquea 15 minutos.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-borde-suave pt-4">
        <Boton variante="secundario" cargando={ocupado === "salir"} onClick={() => salir(false)}>
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </Boton>
        {confirmandoTodo ? (
          <span className="flex items-center gap-1">
            <Boton variante="peligro" cargando={ocupado === "todo"} onClick={() => salir(true)}>
              Sí, cerrar todas
            </Boton>
            <Boton variante="fantasma" onClick={() => setConfirmandoTodo(false)}>
              No
            </Boton>
          </span>
        ) : (
          <Boton variante="peligro" onClick={() => setConfirmandoTodo(true)}>
            <MonitorX className="size-4" aria-hidden="true" />
            Cerrar en todos los dispositivos
          </Boton>
        )}
      </div>
    </Tarjeta>
  );
}

/* ─── Datos ──────────────────────────────────────────────────────────────── */

export function SeccionDatos() {
  return (
    <Tarjeta titulo="Tus datos">
      <p className="text-[13.5px] leading-relaxed text-tinta-2">
        Todo vive en tu base de MongoDB Atlas. El CSV abre en Excel o Google Sheets; el respaldo guarda todo (cuentas, metas,
        pagos fijos, topes) y sirve para reconstruir la app si algún día pierdes la base.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <BotonEnlace href="/api/exportar" descarga variante="secundario">
          <Download className="size-4" aria-hidden="true" />
          Movimientos en CSV
        </BotonEnlace>
        <BotonEnlace href="/api/respaldo" descarga variante="secundario">
          <Download className="size-4" aria-hidden="true" />
          Respaldo completo
        </BotonEnlace>
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-tinta-3">
        Para restaurar un respaldo: <code className="rounded bg-superficie-alta px-1.5 py-0.5 font-mono text-tinta-2">npm run restaurar -- archivo.json</code>{" "}
        (instrucciones en el README).
      </p>
    </Tarjeta>
  );
}

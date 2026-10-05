"use client";

import { useReducedMotion } from "framer-motion";
import { CalendarClock, CalendarPlus, CreditCard, ImagePlus, MousePointerClick, PartyPopper, Receipt } from "lucide-react";
import { useCallback, useState } from "react";
import { CalendarioEscritorio, type DatosMes } from "@/components/calendario/escenario";
import { PersonalizarPortada } from "@/components/calendario/personalizar-portada";
import { useDatos } from "@/components/datos-panel";
import { ModalPago, ModalPagoFijo } from "@/components/paneles/pagos-fijos";
import { Boton } from "@/components/ui/boton";
import { Cabecera } from "@/components/ui/cabecera";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import {
  celdasDelMes,
  diaConAgenda,
  resumenDelMes,
  type Celda,
  type DiaCalendario,
} from "@/lib/calendario";
import { pesos } from "@/lib/dinero";
import { fechaCorta, fechaLarga, hoyISO, mesActual, sumarMeses } from "@/lib/fechas";
import type { GastoAgendado, Portadas, RecordatorioCalculado, Resumen } from "@/lib/types";

function ProximoPago({
  recordatorios,
  onRegistrar,
}: {
  recordatorios: RecordatorioCalculado[];
  onRegistrar: (r: RecordatorioCalculado) => void;
}) {
  const proximo = recordatorios
    .filter((r) => r.activo && !r.pagado)
    .sort((a, b) => a.diasFaltantes - b.diasFaltantes)[0];

  if (!proximo) {
    return (
      <Tarjeta titulo="Próximo pago">
        <p className="flex items-center gap-2 text-[14px] text-tinta-2">
          <CalendarClock className="size-4 shrink-0 text-verde" aria-hidden="true" />
          No hay pagos fijos pendientes por ahora.
        </p>
      </Tarjeta>
    );
  }

  const vencido = proximo.vencido;
  const dias = Math.abs(proximo.diasFaltantes);
  const cuando =
    proximo.diasFaltantes === 0
      ? "Vence hoy"
      : vencido
        ? `Vencido hace ${dias} ${dias === 1 ? "día" : "días"}`
        : proximo.diasFaltantes === 1
          ? "Vence mañana"
          : `Vence en ${dias} días`;

  return (
    <Tarjeta titulo="Próximo pago">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-medium text-tinta">
            <CalendarClock className={`size-4.5 shrink-0 ${vencido ? "text-alerta" : "text-verde"}`} aria-hidden="true" />
            {proximo.titulo}
          </p>
          <p className={`mt-1 text-[13px] ${vencido ? "text-alerta" : "text-tinta-3"}`}>
            {cuando} · {fechaLarga(proximo.vencimiento)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {proximo.montoEstimado > 0 && (
            <span className="text-[17px] font-semibold tabular text-tinta">{pesos(proximo.montoEstimado)}</span>
          )}
          <Boton tamano="sm" variante="secundario" onClick={() => onRegistrar(proximo)}>
            Registrar pago
          </Boton>
        </div>
      </div>
    </Tarjeta>
  );
}

/** Una cuota de tarjeta o un gasto anotado con fecha: solo se consulta, no se paga desde aquí. */
function GastoDelDia({ g, pasado }: { g: GastoAgendado; pasado: boolean }) {
  const { catalogo, cuentas } = useDatos();
  const esCuota = g.cuota !== null;
  const cuenta = cuentas.find((x) => x.id === g.cuentaId)?.nombre;
  const Icono = esCuota ? CreditCard : Receipt;
  const detalle = esCuota
    ? `Cuota ${g.cuota} de ${g.cuotas} · ${cuenta ?? "Tarjeta"}`
    : `Gasto anotado${cuenta ? ` · ${cuenta}` : ""}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <Icono className={`size-3.5 shrink-0 ${pasado ? "text-tinta-3" : "text-agua"}`} aria-hidden="true" />
        <span className="min-w-0">
          <span className={`block truncate text-[13.5px] ${pasado ? "text-tinta-3" : "text-tinta-2"}`}>
            {g.nota || catalogo.etiqueta(g.categoria)}
          </span>
          <span className="block text-[12px] text-tinta-3">{detalle}</span>
        </span>
      </span>
      <span className={`text-[13.5px] tabular ${pasado ? "text-tinta-3" : "text-tinta-2"}`}>{pesos(g.monto)}</span>
    </div>
  );
}

function PagosDelDia({
  c,
  puedeRegistrar,
  onRegistrar,
}: {
  c: DiaCalendario;
  puedeRegistrar: boolean;
  onRegistrar: (r: RecordatorioCalculado) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {c.festivo && (
        <span className="flex items-center gap-1.5 text-[13.5px] text-aviso">
          <PartyPopper className="size-3.5 shrink-0" aria-hidden="true" />
          {c.festivo.nombre}
        </span>
      )}
      {c.pagos.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`flex min-w-0 items-center gap-1.5 text-[13.5px] ${
              p.pagado ? "text-tinta-3 line-through" : p.vencido ? "text-alerta" : "text-tinta-2"
            }`}
          >
            <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block">{p.titulo}</span>
              {(p.fecha !== null || p.montoEstimado > 0) && (
                <span className="block text-[12px] text-tinta-3 no-underline tabular">
                  {[p.fecha !== null ? "Gasto programado" : null, p.montoEstimado > 0 ? pesos(p.montoEstimado) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </span>
          </span>
          {/* Un gasto programado se puede pagar por adelantado, desde cualquier mes. */}
          {(puedeRegistrar || p.fecha !== null) && !p.pagado && (
            <Boton tamano="sm" variante="fantasma" onClick={() => onRegistrar(p)}>
              Registrar
            </Boton>
          )}
        </div>
      ))}
      {c.gastos.map((g) => (
        <GastoDelDia key={g.id} g={g} pasado={c.pasado} />
      ))}
    </div>
  );
}

function DiaElegido({
  c,
  puedeRegistrar,
  onRegistrar,
  onProgramar,
  hoy,
}: {
  c: DiaCalendario | null;
  puedeRegistrar: boolean;
  onRegistrar: (r: RecordatorioCalculado) => void;
  onProgramar: (fecha: string) => void;
  hoy: string;
}) {
  if (!c) {
    return (
      <Tarjeta titulo="Día">
        <p className="flex items-center gap-2 text-[14px] text-tinta-3">
          <MousePointerClick className="size-4 shrink-0" aria-hidden="true" />
          Toca un día del calendario para ver sus festivos, pagos y cuotas.
        </p>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta titulo={c.esHoy ? "Hoy" : "Día"}>
      <p className="mb-3 text-[15px] font-medium text-tinta">{fechaLarga(c.fecha)}</p>
      {diaConAgenda(c) ? (
        <PagosDelDia c={c} puedeRegistrar={puedeRegistrar} onRegistrar={onRegistrar} />
      ) : (
        <p className="text-[13.5px] text-tinta-3">Sin festivos, pagos ni cuotas este día.</p>
      )}
      {c.fecha >= hoy && (
        <Boton tamano="sm" variante="secundario" className="mt-4" onClick={() => onProgramar(c.fecha)}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          Programar gasto este día
        </Boton>
      )}
    </Tarjeta>
  );
}

function ListaDelMes({
  celdas,
  onRegistrar,
  puedeRegistrar,
}: {
  celdas: Celda[];
  onRegistrar: (r: RecordatorioCalculado) => void;
  puedeRegistrar: boolean;
}) {
  const conAlgo = celdas.filter((c): c is DiaCalendario => c !== null && diaConAgenda(c));
  if (conAlgo.length === 0) {
    return <Vacio mensaje="Sin festivos, pagos fijos ni cuotas de tarjeta que caigan este mes." />;
  }
  return (
    <ul className="flex flex-col">
      {conAlgo.map((c) => (
        <li key={c.fecha} className="flex items-start gap-3 border-b border-borde-suave py-2.5 last:border-b-0">
          <span className="w-14 shrink-0 text-[12.5px] tabular text-tinta-3">{fechaCorta(c.fecha)}</span>
          <PagosDelDia c={c} puedeRegistrar={puedeRegistrar} onRegistrar={onRegistrar} />
        </li>
      ))}
    </ul>
  );
}

export function VistaCalendario({
  resumen: r,
  portadas: portadasIniciales,
  gastos,
}: {
  resumen: Resumen;
  portadas: Portadas;
  /** Cuotas de tarjeta (de cualquier mes) y gastos anotados con fecha por venir. */
  gastos: GastoAgendado[];
}) {
  const hoy = hoyISO();
  const mesHoy = hoy.slice(0, 7);
  const sinMovimiento = useReducedMotion();

  const [mes, setMes] = useState(r.mes);
  const [destino, setDestino] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(r.mes === mesHoy ? hoy : null);
  const [pagando, setPagando] = useState<RecordatorioCalculado | null>(null);
  const [portadas, setPortadas] = useState(portadasIniciales);
  const [personalizando, setPersonalizando] = useState(false);
  const [programando, setProgramando] = useState<string | null>(null);
  const abrirPersonalizar = useCallback(() => setPersonalizando(true), []);
  const cerrarPersonalizar = useCallback(() => setPersonalizando(false), []);

  // Los pagos fijos se repiten cada mes y las cuotas llegan de todos los meses,
  // así que cualquier mes se arma aquí mismo: pasar de hoja no tiene que esperar
  // al servidor.
  const datosDe = (m: string): DatosMes => {
    const celdas = celdasDelMes(m, hoy, r.recordatorios, gastos);
    return { celdas, resumen: resumenDelMes(celdas) };
  };

  const fijar = (m: string) => {
    setMes(m);
    setDestino(null);
    setSeleccionado(m === mesHoy ? hoy : null);
    // La URL sigue al mes para que recargar o compartir muestre el mismo, sin
    // volver a pedir la página al servidor.
    window.history.replaceState(null, "", m === mesActual() ? "/calendario" : `/calendario?mes=${m}`);
  };

  const irA = (m: string) => {
    if (destino !== null || m === mes) return;
    if (sinMovimiento) fijar(m);
    else setDestino(m);
  };

  const { celdas } = datosDe(mes);
  const esMesReal = mes === mesHoy;
  const dia = celdas.find((c): c is DiaCalendario => c !== null && c.fecha === seleccionado) ?? null;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Cabecera
        titulo="Calendario"
        subtitulo="Festivos de Colombia, cuándo vencen tus pagos fijos y las cuotas de tu tarjeta."
        acciones={
          <>
            {mes !== mesHoy && (
              <Boton tamano="sm" variante="fantasma" onClick={() => irA(mesHoy)} disabled={destino !== null}>
                Ir al mes actual
              </Boton>
            )}
            <Boton tamano="sm" variante="secundario" onClick={abrirPersonalizar}>
              <ImagePlus className="size-4" aria-hidden="true" />
              Personalizar portada
            </Boton>
          </>
        }
      />

      <div className="py-2 sm:py-4">
        <CalendarioEscritorio
          mes={mes}
          destino={destino}
          datosDe={datosDe}
          seleccionado={seleccionado}
          onSeleccionar={setSeleccionado}
          onIrA={irA}
          onTerminar={() => destino !== null && fijar(destino)}
          anterior={sumarMeses(mes, -1)}
          siguiente={sumarMeses(mes, 1)}
          portadas={portadas}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DiaElegido c={dia} puedeRegistrar={esMesReal} onRegistrar={setPagando} onProgramar={setProgramando} hoy={hoy} />
        <ProximoPago recordatorios={r.recordatorios} onRegistrar={setPagando} />
      </div>

      <Tarjeta titulo="Detalle del mes">
        {!esMesReal && (
          <p className="mb-3 text-[12.5px] text-tinta-3">
            Estos son los días en que vence cada pago fijo este mes; el estado de pagado o pendiente es el del mes en curso.
          </p>
        )}
        <ListaDelMes celdas={celdas} onRegistrar={setPagando} puedeRegistrar={esMesReal} />
      </Tarjeta>

      <ModalPago recordatorio={pagando} onCerrar={() => setPagando(null)} />
      <ModalPagoFijo
        abierto={programando !== null}
        recordatorio={null}
        fechaInicial={programando ?? undefined}
        onCerrar={() => setProgramando(null)}
      />
      <PersonalizarPortada
        abierto={personalizando}
        mes={mes}
        portadas={portadas}
        onCerrar={cerrarPersonalizar}
        onCambio={setPortadas}
      />
    </div>
  );
}

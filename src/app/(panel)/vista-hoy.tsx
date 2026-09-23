"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Circle, Wallet } from "lucide-react";
import Link from "next/link";
import { useCaptura } from "@/components/captura";
import { ListaAlertas } from "@/components/paneles/alertas";
import { Barra } from "@/components/paneles/barra";
import { ListaMovimientos } from "@/components/paneles/lista-movimientos";
import { ListaPagosFijos } from "@/components/paneles/pagos-fijos";
import { Boton } from "@/components/ui/boton";
import { Cifra } from "@/components/ui/cifra";
import { Tarjeta } from "@/components/ui/tarjeta";
import { pesos } from "@/lib/dinero";
import { DIAS_SEMANA, fechaLarga } from "@/lib/fechas";
import type { Resumen } from "@/lib/types";

function VerTodo({ href, texto = "Ver todo" }: { href: string; texto?: string }) {
  return (
    <Link
      href={href}
      className="area-toque -my-3 flex items-center gap-1 py-3 text-[12.5px] text-tinta-3 transition-colors hover:text-verde"
    >
      {texto}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

/** Primeros pasos: solo se muestra mientras falte lo básico. */
function PrimerosPasos({ r }: { r: Resumen }) {
  const pasos = [
    { hecho: r.ajustes.sueldos.length > 0, texto: "Define tu sueldo mensual", href: "/ajustes#sueldo" },
    { hecho: r.recordatorios.length > 0, texto: "Agrega tus pagos fijos (arriendo, celular...)", href: "/presupuesto#pagos-fijos" },
    { hecho: r.metas.length > 0, texto: "Crea una meta de ahorro", href: "/metas" },
  ];
  if (pasos.every((p) => p.hecho)) return null;
  return (
    <Tarjeta titulo="Para que las cifras sean reales">
      <ol className="flex flex-col gap-1">
        {pasos.map((p) => (
          <li key={p.texto}>
            <Link
              href={p.href}
              className="flex min-h-11 items-center gap-3 rounded-lg px-1 text-[14px] transition-colors hover:bg-superficie-alta/50"
            >
              {p.hecho ? (
                <Check className="size-4 shrink-0 text-verde" aria-hidden="true" />
              ) : (
                <Circle className="size-4 shrink-0 text-tinta-3" aria-hidden="true" />
              )}
              <span className={p.hecho ? "text-tinta-3 line-through" : "text-tinta"}>
                <span className="sr-only">{p.hecho ? "Hecho: " : "Pendiente: "}</span>
                {p.texto}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}

function Protagonista({ r }: { r: Resumen }) {
  const captura = useCaptura();
  const enRojo = r.libre < 0;
  const porcentajeLibre = r.ingresoTotal > 0 ? Math.round((Math.max(0, r.libre) / r.ingresoTotal) * 100) : 0;
  const dias = r.diasRestantes ?? 0;

  const filas = [
    {
      etiqueta: r.sueldoRegistrado || r.sueldoEsperado === 0 ? "Ingreso del mes" : "Ingreso del mes (con sueldo esperado)",
      valor: r.ingresoTotal,
      signo: "",
    },
    { etiqueta: "Gastado", valor: r.gastado, signo: "− " },
    { etiqueta: "Ahorro neto", valor: r.ahorroNeto, signo: "− " },
    { etiqueta: "Pagos fijos pendientes", valor: r.fijosPendientes, signo: "− " },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="titulo-libre"
      className="tarjeta p-5 sm:p-7 lg:col-span-3"
    >
      <h2 id="titulo-libre" className="text-[12px] font-semibold tracking-[0.12em] text-tinta-3 uppercase">
        {enRojo ? "Este mes no alcanza" : "Puedes gastar"}
      </h2>

      {enRojo ? (
        <>
          <p className="mt-2 font-display text-[clamp(2.1rem,8vw,3.2rem)] leading-none font-semibold text-alerta">
            Te faltan <Cifra valor={Math.abs(r.libre)} />
          </p>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-tinta-2">
            {r.fijosPendientes > 0
              ? `Contando los ${pesos(r.fijosPendientes)} en pagos fijos que todavía salen, lo que entra este mes no cubre lo que ya gastaste y apartaste.`
              : "Lo que ya gastaste y apartaste supera lo que entra este mes."}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Cifra
              valor={r.porDia ?? 0}
              className="font-display text-[clamp(2.4rem,9vw,3.6rem)] leading-none font-semibold text-tinta"
            />
            <span className="text-[16px] text-tinta-2">por día</span>
          </p>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-tinta-2">
            Te quedan <strong className="font-semibold text-verde">{pesos(r.libre)}</strong> libres para{" "}
            {dias === 1 ? "hoy, el último día del mes" : `los próximos ${dias} días`}
            {r.fijosPendientes > 0 ? `, ya descontados ${pesos(r.fijosPendientes)} en pagos fijos que faltan.` : "."}
          </p>
          {r.porDiaTrasMetas !== null && (
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-tinta-3">
              Si además apartas los {pesos(r.cuotaMetasPendiente)} que tus metas piden este mes, serían{" "}
              <span className="font-semibold text-tinta-2">{pesos(r.porDiaTrasMetas)}</span> por día.
            </p>
          )}
          <div className="mt-5 flex flex-col gap-1.5">
            <Barra
              porcentaje={porcentajeLibre}
              estado={porcentajeLibre < 10 ? "cerca" : "normal"}
              etiqueta={`Libre: ${porcentajeLibre}% del ingreso del mes`}
            />
            <p className="text-[12.5px] text-tinta-3">Queda libre el {porcentajeLibre}% de lo que entra este mes.</p>
          </div>
        </>
      )}

      <dl className="mt-6 border-t border-borde-suave pt-3 text-[14px]">
        {filas.map((f) => (
          <div key={f.etiqueta} className="flex items-center justify-between gap-3 py-1.5">
            <dt className="text-tinta-3">{f.etiqueta}</dt>
            <dd className="tabular text-tinta-2">
              {f.signo}
              {pesos(f.valor)}
            </dd>
          </div>
        ))}
        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-borde-suave pt-2.5">
          <dt className="font-semibold text-tinta">Libre</dt>
          <dd className={`font-semibold tabular ${enRojo ? "text-alerta" : "text-verde"}`}>{pesos(r.libre)}</dd>
        </div>
      </dl>

      {!r.sueldoRegistrado && r.sueldoEsperado > 0 && (
        <Boton
          variante="secundario"
          tamano="sm"
          className="mt-4"
          onClick={() => captura.abrir({ tipo: "ingreso", categoria: "sueldo", monto: r.sueldoEsperado })}
        >
          <Wallet className="size-4" aria-hidden="true" />
          Registrar el sueldo de este mes
        </Boton>
      )}
    </motion.section>
  );
}

export function VistaHoy({ resumen: r }: { resumen: Resumen }) {
  const pendientes = r.recordatorios.filter((x) => x.activo && !x.pagado);
  const alertas = r.alertas.filter((a) => a.clave !== "libre").slice(0, 3);
  const [anio, mes, dia] = r.hoy.split("-").map(Number);
  const diaSemana = DIAS_SEMANA[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header>
        <p className="text-[13px] font-medium text-tinta-3">
          {diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, {fechaLarga(r.hoy)}
        </p>
        <h1 className="mt-0.5 font-display text-[26px] leading-tight font-semibold text-tinta sm:text-3xl">Hoy</h1>
      </header>

      <PrimerosPasos r={r} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Protagonista r={r} />

        <Tarjeta
          titulo="Pagos fijos del mes"
          className="lg:col-span-2"
          retraso={0.05}
          accion={<VerTodo href="/presupuesto#pagos-fijos" />}
        >
          {pendientes.length > 0 ? (
            <ListaPagosFijos recordatorios={pendientes} limite={5} />
          ) : r.recordatorios.length > 0 ? (
            <p className="flex items-center gap-2 text-[14px] text-tinta-2">
              <Check className="size-4 text-verde" aria-hidden="true" />
              Todos los pagos fijos del mes están al día.
            </p>
          ) : (
            <ListaPagosFijos recordatorios={[]} />
          )}
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Tarjeta titulo="Para revisar" className="lg:col-span-3" retraso={0.1}>
          {alertas.length > 0 ? (
            <ListaAlertas alertas={alertas} />
          ) : (
            <p className="flex items-center gap-2 text-[14px] text-tinta-2">
              <Check className="size-4 text-verde" aria-hidden="true" />
              Nada que revisar: sin topes pasados ni pagos vencidos.
            </p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Metas" className="lg:col-span-2" retraso={0.1} accion={<VerTodo href="/metas" />}>
          {r.metas.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {r.metas.slice(0, 3).map((m) => (
                <li key={m.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] text-tinta">{m.nombre}</span>
                    <span className="shrink-0 text-[12.5px] tabular text-tinta-3">{m.progreso}%</span>
                  </div>
                  <Barra porcentaje={m.progreso} etiqueta={`${m.nombre}: ${m.progreso}%`} />
                  <span className="text-[12.5px] tabular text-tinta-3">
                    {pesos(m.ahorrado)} de {pesos(m.monto)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] leading-relaxed text-tinta-3">
              Sin metas todavía. Una meta con fecha te dice cuánto apartar cada mes.
            </p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Últimos movimientos" retraso={0.15} accion={<VerTodo href="/movimientos" />}>
        <ListaMovimientos
          movimientos={r.movimientos.slice(0, 5)}
          mensajeVacio="Todavía no registras nada este mes. Usa el botón + para el primer gasto."
        />
      </Tarjeta>
    </div>
  );
}

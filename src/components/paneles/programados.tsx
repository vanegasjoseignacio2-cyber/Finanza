"use client";

import { motion } from "framer-motion";
import { Cake, CalendarHeart, CalendarPlus, Gift, Heart } from "lucide-react";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { pesos } from "@/lib/dinero";
import { DIAS_SEMANA, fechaLarga } from "@/lib/fechas";
import type { RecordatorioCalculado } from "@/lib/types";
import { ModalPago, ModalPagoFijo, Regresiva, textoFalta } from "./pagos-fijos";

/** Un ícono que se parezca a la ocasión, por el nombre que le puso el usuario. */
function IconoOcasion({ titulo, className }: { titulo: string; className: string }) {
  const t = titulo.toLowerCase();
  if (/cumple/.test(t)) return <Cake className={className} aria-hidden="true" />;
  if (/aniversario|novi|amor|boda|san valent/.test(t)) return <Heart className={className} aria-hidden="true" />;
  if (/regalo|navidad|amigo secreto|detalle/.test(t)) return <Gift className={className} aria-hidden="true" />;
  return <CalendarHeart className={className} aria-hidden="true" />;
}

function diaDeLaSemana(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

/**
 * Banner de gastos programados una sola vez (cumpleaños, aniversarios): el más
 * próximo en grande con su cuenta regresiva, y los siguientes debajo. Sin
 * ninguno, invita a programar el primero.
 */
export function BannerProgramados({ recordatorios }: { recordatorios: RecordatorioCalculado[] }) {
  const [programando, setProgramando] = useState(false);
  const [pagando, setPagando] = useState<RecordatorioCalculado | null>(null);

  const programados = recordatorios
    .filter((r) => r.fecha !== null && r.activo && !r.pagado)
    .sort((a, b) => a.diasFaltantes - b.diasFaltantes);
  const [primero, ...resto] = programados;

  const modales = (
    <>
      <ModalPagoFijo abierto={programando} recordatorio={null} unico onCerrar={() => setProgramando(false)} />
      <ModalPago recordatorio={pagando} onCerrar={() => setPagando(null)} />
    </>
  );

  if (!primero) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="tarjeta relative flex flex-col gap-3 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_140%_at_0%_0%,rgba(251,191,36,.10),transparent_60%)]"
        />
        <span className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-aviso/30 bg-aviso/10 text-aviso">
          <Cake className="size-5" aria-hidden="true" />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-[15px] font-medium text-tinta">¿Se viene un cumpleaños o un aniversario?</p>
          <p className="mt-0.5 text-[13.5px] text-tinta-3">
            Prográmalo una sola vez: lo descontamos de ese mes y te decimos cuántos días faltan.
          </p>
        </div>
        <Boton variante="secundario" tamano="sm" className="relative self-start sm:self-center" onClick={() => setProgramando(true)}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          Programar gasto
        </Boton>
        {modales}
      </motion.section>
    );
  }

  const urgente = primero.diasFaltantes <= 3;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Gastos programados"
      className="tarjeta relative overflow-hidden p-5 sm:p-7"
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${
          primero.vencido
            ? "bg-[radial-gradient(90%_140%_at_0%_0%,rgba(251,113,133,.16),transparent_60%)]"
            : "bg-[radial-gradient(90%_140%_at_0%_0%,rgba(251,191,36,.16),transparent_60%)]"
        }`}
      />
      <IconoOcasion
        titulo={primero.titulo}
        className={`pointer-events-none absolute -right-6 -bottom-8 size-44 rotate-[-12deg] opacity-[0.06] ${urgente ? "text-aviso" : "text-tinta"}`}
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <Regresiva r={primero} grande />
        <div className="min-w-0 flex-1">
          <p
            className={`text-[12px] font-semibold tracking-[0.12em] uppercase ${
              primero.vencido ? "text-alerta" : urgente ? "text-aviso" : "text-tinta-3"
            }`}
          >
            {textoFalta(primero.diasFaltantes)}
          </p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-[22px] leading-tight font-semibold text-tinta sm:text-[26px]">
            <IconoOcasion titulo={primero.titulo} className="size-5 shrink-0 text-tinta-2" />
            <span className="min-w-0">{primero.titulo}</span>
          </h2>
          <p className="mt-1 text-[13.5px] text-tinta-3">
            <span className="capitalize">{diaDeLaSemana(primero.vencimiento)}</span> {fechaLarga(primero.vencimiento)}
            {primero.montoEstimado > 0 && (
              <>
                {" · "}
                <span className="tabular text-tinta-2">{pesos(primero.montoEstimado)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Boton tamano="sm" onClick={() => setPagando(primero)}>
            Registrar pago
          </Boton>
          <Boton tamano="sm" variante="fantasma" onClick={() => setProgramando(true)}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            Programar otro
          </Boton>
        </div>
      </div>

      {resto.length > 0 && (
        <ul className="relative mt-5 grid grid-cols-1 gap-2 border-t border-borde-suave pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {resto.slice(0, 3).map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl bg-superficie-alta/50 p-2.5">
              <Regresiva r={r} />
              <div className="min-w-0">
                <p className="truncate text-[14px] text-tinta">{r.titulo}</p>
                <p className="text-[12.5px] text-tinta-3">
                  {fechaLarga(r.vencimiento).split(" de ").slice(0, 2).join(" de ")}
                  {r.montoEstimado > 0 && ` · ${pesos(r.montoEstimado)}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {modales}
    </motion.section>
  );
}

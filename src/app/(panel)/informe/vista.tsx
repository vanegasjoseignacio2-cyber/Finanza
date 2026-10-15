"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Crown, Download, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useCaptura } from "@/components/captura";
import { useDatos } from "@/components/datos-panel";
import { Icono } from "@/components/iconos";
import { Barra } from "@/components/paneles/barra";
import { ListaMovimientos } from "@/components/paneles/lista-movimientos";
import { SelectorMes } from "@/components/selector-mes";
import { BotonEnlace } from "@/components/ui/boton";
import { Cabecera } from "@/components/ui/cabecera";
import { Cifra } from "@/components/ui/cifra";
import { Segmentado, type Opcion } from "@/components/ui/segmentado";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { pesos } from "@/lib/dinero";
import { fechaCorta, mesActual, nombreMes, sumarMeses } from "@/lib/fechas";
import { textoPeriodoInforme as textoPeriodo, type CategoriaInforme, type Informe, type PeriodoInforme } from "@/lib/informe";

const OPCIONES_PERIODO: Opcion<PeriodoInforme>[] = [
  { valor: "mes", etiqueta: "Mes" },
  { valor: "3m", etiqueta: "3 meses" },
  { valor: "6m", etiqueta: "6 meses" },
  { valor: "12m", etiqueta: "12 meses" },
  { valor: "todo", etiqueta: "Todo" },
];

/** 12,5 % — con coma decimal; "< 1 %" cuando es casi nada. */
function porcentajeTexto(valor: number): string {
  if (valor > 0 && valor < 1) return "< 1 %";
  return `${String(valor).replace(".", ",")} %`;
}

/** Contra qué se compara: el mes anterior o los N meses anteriores. */
function textoAnterior(i: Informe): string {
  return i.meses === 1 ? `en ${nombreMes(sumarMeses(i.desde, -1))}` : `en los ${i.meses} meses anteriores`;
}

/** Igual, para frases como "subió $X frente a…". */
function textoFrente(i: Informe): string {
  return i.meses === 1 ? `frente a ${nombreMes(sumarMeses(i.desde, -1))}` : `frente a los ${i.meses} meses anteriores`;
}

/** Más gasto que antes es malo (rojo); menos, bueno (verde). */
function Cambio({ categoria }: { categoria: CategoriaInforme }) {
  if (categoria.anterior === null) return null;
  if (categoria.variacion === null) {
    return <span className="shrink-0 rounded-full bg-superficie-alta px-2 py-0.5 text-[11.5px] text-tinta-2">Nuevo</span>;
  }
  if (categoria.variacion === 0) return <span className="shrink-0 text-[12px] text-tinta-3">Igual que antes</span>;
  const sube = categoria.variacion > 0;
  const Flecha = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium tabular ${sube ? "text-alerta" : "text-verde"}`}>
      <Flecha className="size-3.5" aria-hidden="true" />
      {sube ? "+" : "−"}
      {Math.abs(categoria.variacion)} %<span className="sr-only"> frente al periodo anterior</span>
    </span>
  );
}

function FilaCategoria({
  posicion,
  c,
  maximo,
  abierta,
  alternar,
  enlaceMovimientos,
}: {
  posicion: number;
  c: CategoriaInforme;
  maximo: number;
  abierta: boolean;
  alternar: () => void;
  enlaceMovimientos: string | null;
}) {
  const { catalogo } = useDatos();
  const captura = useCaptura();
  const cat = catalogo.obtener(c.categoria);
  const idPanel = `detalle-${c.categoria}`;

  return (
    <li className="border-b border-borde-suave last:border-b-0">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierta}
        aria-controls={idPanel}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg py-3 text-left transition-colors hover:bg-superficie-alta/40"
      >
        <span className="w-4 shrink-0 text-center text-[12.5px] tabular text-tinta-3">{posicion}</span>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-superficie-alta text-tinta-2">
          <Icono nombre={cat.icono} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[14.5px] text-tinta">{cat.label}</span>
            <span className="shrink-0 text-[14.5px] font-semibold tabular text-tinta">{pesos(c.total)}</span>
          </span>
          <span className="mt-1.5 block">
            <Barra
              porcentaje={maximo ? (c.total / maximo) * 100 : 0}
              estado={posicion === 1 ? "normal" : "neutro"}
              alto="h-1.5"
              etiqueta={`${cat.label}: ${porcentajeTexto(c.porcentaje)} del total gastado`}
            />
          </span>
          <span className="mt-1 flex items-center justify-between gap-3 text-[12.5px] text-tinta-3">
            <span>
              {porcentajeTexto(c.porcentaje)} · {c.cantidad} {c.cantidad === 1 ? "gasto" : "gastos"}
            </span>
            <Cambio categoria={c} />
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-tinta-3 transition-transform duration-200 ${abierta ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            id={idPanel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mb-3 rounded-xl border border-borde-suave bg-fondo-alto p-3">
              <dl className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <dt className="text-tinta-3">Promedio por gasto</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular text-tinta">{pesos(c.promedio)}</dd>
                </div>
                <div>
                  <dt className="text-tinta-3">Periodo anterior</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular text-tinta">
                    {c.anterior === null ? "—" : pesos(c.anterior)}
                  </dd>
                </div>
              </dl>

              <h4 className="mt-3 mb-1 text-[12px] font-semibold tracking-wide text-tinta-3 uppercase">
                {c.mayores.length === 1 ? "El gasto" : "Los gastos más grandes"}
              </h4>
              <ul className="flex flex-col">
                {c.mayores.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => captura.ver(m)}
                      aria-label={`Ver detalle: ${m.nota || cat.label}, ${pesos(m.monto)}, ${fechaCorta(m.fecha)}`}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-2 text-left text-[13.5px] transition-colors hover:bg-superficie-alta/50"
                    >
                      <span className="min-w-0 truncate text-tinta-2">
                        <span className="text-tinta-3">{fechaCorta(m.fecha)}</span> · {m.nota || cat.label}
                        {m.cuota && m.cuotas ? ` (cuota ${m.cuota}/${m.cuotas})` : ""}
                      </span>
                      <span className="shrink-0 font-medium tabular text-tinta">{pesos(m.monto)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {enlaceMovimientos && (
                <Link
                  href={enlaceMovimientos}
                  className="mt-2 inline-flex min-h-9 items-center text-[13px] text-tinta-2 underline-offset-4 transition-colors hover:text-tinta hover:underline"
                >
                  Ver los {c.cantidad} {c.cantidad === 1 ? "gasto" : "gastos"} en Movimientos
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function VistaInforme({ informe: i, periodo, mes }: { informe: Informe; periodo: PeriodoInforme; mes: string }) {
  const router = useRouter();
  const { catalogo } = useDatos();
  const [abierta, setAbierta] = useState<string | null>(i.categorias[0]?.categoria ?? null);
  const nombre = (id: string) => catalogo.obtener(id).label;

  function elegirPeriodo(nuevo: PeriodoInforme) {
    const q = new URLSearchParams();
    if (nuevo !== "mes") q.set("periodo", nuevo);
    if (mes !== mesActual()) q.set("mes", mes);
    const texto = q.toString();
    router.push(texto ? `/informe?${texto}` : "/informe", { scroll: false });
  }

  const hayGastos = i.cantidad > 0;
  const maximo = i.categorias[0]?.total ?? 0;
  const mayor = i.categorias[0];
  const tresPrimeras = i.categorias.slice(0, 3).reduce((s, c) => s + c.porcentaje, 0);
  const maximoMes = Math.max(0, ...i.porMes.map((m) => m.total));
  const gastoMayor = i.mayores[0];

  const resaltes: { clave: string; icono: LucideIcon; tono: string; texto: ReactNode }[] = [];
  if (mayor) {
    resaltes.push({
      clave: "mayor",
      icono: Crown,
      tono: "text-tinta",
      texto: (
        <>
          Lo que más gastaste fue <strong className="font-semibold text-tinta">{nombre(mayor.categoria)}</strong>:{" "}
          {pesos(mayor.total)}, el {porcentajeTexto(mayor.porcentaje)} del total.
        </>
      ),
    });
  }
  if (i.categorias.length >= 4) {
    resaltes.push({
      clave: "tres",
      icono: Crown,
      tono: "text-tinta-3",
      texto: <>Las tres categorías de arriba suman el {porcentajeTexto(Math.round(tresPrimeras * 10) / 10)} de tu gasto.</>,
    });
  }
  if (i.masSubio) {
    resaltes.push({
      clave: "subio",
      icono: TrendingUp,
      tono: "text-alerta",
      texto: (
        <>
          <strong className="font-semibold text-tinta">{nombre(i.masSubio.categoria)}</strong> subió {pesos(i.masSubio.diferencia)} {textoFrente(i)}.
        </>
      ),
    });
  }
  if (i.masBajo) {
    resaltes.push({
      clave: "bajo",
      icono: TrendingDown,
      tono: "text-verde",
      texto: (
        <>
          <strong className="font-semibold text-tinta">{nombre(i.masBajo.categoria)}</strong> bajó {pesos(Math.abs(i.masBajo.diferencia))} {textoFrente(i)}.
        </>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Cabecera
        titulo="Informe de gastos"
        subtitulo="En qué se fue tu plata, categoría por categoría."
        acciones={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="sm:w-96">
              <Segmentado
                etiqueta="Periodo del informe"
                ocultarEtiqueta
                opciones={OPCIONES_PERIODO}
                valor={periodo}
                onCambio={elegirPeriodo}
                columnas="grid-cols-5"
              />
            </div>
            {periodo !== "todo" && (
              <SelectorMes mes={mes} ruta="/informe" otros={periodo === "mes" ? {} : { periodo }} />
            )}
            {hayGastos && (
              <BotonEnlace href={`/api/informe/exportar?periodo=${periodo}&mes=${mes}`} descarga variante="secundario">
                <Download className="size-4" aria-hidden="true" />
                Descargar Excel
              </BotonEnlace>
            )}
          </div>
        }
      />

      {!hayGastos ? (
        <Tarjeta>
          <Vacio mensaje={`No hay gastos registrados en ${textoPeriodo(i).toLowerCase()}. Cambia el periodo o el mes para ver otro informe.`} />
        </Tarjeta>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Tarjeta className="lg:col-span-3">
              <p className="text-[12px] font-semibold tracking-[0.12em] text-tinta-3 uppercase">Total gastado · {textoPeriodo(i)}</p>
              <p className="mt-2 font-display text-[clamp(2.2rem,8vw,3.2rem)] leading-none font-semibold text-tinta">
                <Cifra valor={i.total} />
              </p>
              {i.anterior !== null && (
                <p className="mt-3 text-[14px] leading-relaxed text-tinta-2">
                  {i.variacion === 0 ? (
                    <>Igual que {textoAnterior(i)}.</>
                  ) : (
                    <>
                      <span className={`font-semibold tabular ${i.total > i.anterior ? "text-alerta" : "text-verde"}`}>
                        {i.total > i.anterior ? "▲" : "▼"} {pesos(Math.abs(i.total - i.anterior))} ({Math.abs(i.variacion ?? 0)} %)
                      </span>{" "}
                      {i.total > i.anterior ? "más" : "menos"} que {textoAnterior(i)}.
                    </>
                  )}
                </p>
              )}

              <dl className="mt-5 grid grid-cols-2 gap-3">
                <Dato titulo="Gastos registrados" valor={String(i.cantidad)} />
                {i.promedioDiario !== null && <Dato titulo="Promedio por día" valor={pesos(i.promedioDiario)} />}
                {i.meses > 1 && <Dato titulo="Promedio por mes" valor={pesos(i.promedioMensual)} />}
                {gastoMayor && (
                  <Dato
                    titulo="Gasto más grande"
                    valor={pesos(gastoMayor.monto)}
                    detalle={`${gastoMayor.nota || nombre(gastoMayor.categoria)} · ${fechaCorta(gastoMayor.fecha)}`}
                  />
                )}
              </dl>
            </Tarjeta>

            <Tarjeta titulo="Lo que más pesó" className="lg:col-span-2" retraso={0.05}>
              <ul className="flex flex-col gap-3">
                {resaltes.map((r) => (
                  <li key={r.clave} className="flex items-start gap-3 text-[14px] leading-relaxed text-tinta-2">
                    <r.icono className={`mt-0.5 size-4 shrink-0 ${r.tono}`} aria-hidden="true" />
                    <span>{r.texto}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-start">
            <Tarjeta titulo="Gasto por categoría" className="lg:col-span-3" retraso={0.1}>
              <ul className="flex flex-col">
                {i.categorias.map((c, indice) => (
                  <FilaCategoria
                    key={c.categoria}
                    posicion={indice + 1}
                    c={c}
                    maximo={maximo}
                    abierta={abierta === c.categoria}
                    alternar={() => setAbierta((a) => (a === c.categoria ? null : c.categoria))}
                    enlaceMovimientos={
                      periodo === "mes" ? `/movimientos?tipo=gasto&categoria=${encodeURIComponent(c.categoria)}&mes=${i.hasta}` : null
                    }
                  />
                ))}
              </ul>
            </Tarjeta>

            <div className="flex flex-col gap-4 lg:col-span-2">
              {i.meses > 1 && (
                <Tarjeta titulo="Mes a mes" retraso={0.15}>
                  <ul className="flex flex-col gap-1">
                    {i.porMes.map((m) => (
                      <li key={m.mes}>
                        <Link
                          href={`/informe?mes=${m.mes}`}
                          className="flex items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-superficie-alta/40"
                          aria-label={`${nombreMes(m.mes)}: ${pesos(m.total)}. Abrir el informe de ese mes`}
                        >
                          <span className="w-14 shrink-0 text-[13px] text-tinta-3 capitalize">{m.etiqueta}</span>
                          <span className="min-w-0 flex-1">
                            <Barra
                              porcentaje={maximoMes ? (m.total / maximoMes) * 100 : 0}
                              estado={m.total === maximoMes && m.total > 0 ? "normal" : "neutro"}
                              alto="h-1.5"
                              etiqueta={`${nombreMes(m.mes)}: ${pesos(m.total)}`}
                            />
                          </span>
                          <span className="w-24 shrink-0 text-right text-[13.5px] tabular text-tinta-2">{pesos(m.total)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Tarjeta>
              )}

              <Tarjeta titulo="Tus gastos más grandes" retraso={0.2}>
                <ListaMovimientos movimientos={i.mayores} />
              </Tarjeta>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Dato({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-borde-suave bg-superficie-alta px-4 py-3">
      <dt className="text-[12px] text-tinta-3">{titulo}</dt>
      <dd className="mt-0.5 font-display text-[19px] font-semibold tabular text-tinta">{valor}</dd>
      {detalle && <dd className="mt-0.5 truncate text-[11.5px] text-tinta-3">{detalle}</dd>}
    </div>
  );
}

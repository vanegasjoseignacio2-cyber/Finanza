"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Banknote, CreditCard, Landmark, PiggyBank, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAvisos } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Confirmar } from "@/components/ui/confirmar";
import { Segmentado, type Opcion } from "@/components/ui/segmentado";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import { fechaCorta, hoyISO } from "@/lib/fechas";
import { calendarioCuotas, primeraCuotaPorDefecto, repartirCuotas } from "@/lib/finanzas";
import type { CuentaConSaldo, TipoCuenta } from "@/lib/types";

/** Ejecuta una petición, avisa y refresca los datos del servidor. */
function useEjecutar() {
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

export const TIPOS_CUENTA: { valor: TipoCuenta; etiqueta: string }[] = [
  { valor: "corriente", etiqueta: "Banco" },
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "ahorro", etiqueta: "Ahorro" },
  { valor: "tarjeta", etiqueta: "Tarjeta de crédito" },
];

/**
 * Caja que sigue suavemente el alto de lo que lleva dentro. Al cambiar de tipo de cuenta, la sección
 * de abajo cambia de tamaño (la tarjeta tiene más campos): en vez de que el formulario salte de un
 * alto al otro, el alto se anima de una sola vez, de lo que había a lo que hay, y lo nuevo aparece con
 * un fundido. Sin plegar primero y desplegar después, que se sentía como dos saltos seguidos.
 * El borde se recorta solo mientras anima, para no cortar el anillo de enfoque de los campos.
 */
function AlturaSuave({ children, className = "" }: { children: ReactNode; className?: string }) {
  const interno = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState<number | "auto">("auto");
  const [animando, setAnimando] = useState(false);
  const sinMovimiento = useReducedMotion();

  useEffect(() => {
    const el = interno.current;
    if (!el) return;
    const medir = () => setAlto(el.getBoundingClientRect().height);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height: alto }}
      transition={sinMovimiento ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      onAnimationStart={() => setAnimando(true)}
      onAnimationComplete={() => setAnimando(false)}
      style={{ overflow: animando ? "hidden" : "visible" }}
    >
      <div ref={interno} className={className}>
        {children}
      </div>
    </motion.div>
  );
}

/** Mismo selector con íconos que el de un movimiento nuevo: una sola fila. */
const OPCIONES_TIPO: Opcion<TipoCuenta>[] = [
  { valor: "corriente", etiqueta: "Banco", icono: Landmark },
  { valor: "efectivo", etiqueta: "Efectivo", icono: Banknote },
  { valor: "ahorro", etiqueta: "Ahorro", icono: PiggyBank },
  { valor: "tarjeta", etiqueta: "Tarjeta", icono: CreditCard },
];

const CUOTAS_FRECUENTES = [3, 6, 12, 24, 36];

export function FormularioCuenta({
  cuenta,
  tipoInicial = "corriente",
  onListo,
}: {
  cuenta: CuentaConSaldo | null;
  /** Tipo con que arranca una cuenta nueva (p. ej. tarjeta, desde Hoy). */
  tipoInicial?: TipoCuenta;
  onListo: () => void;
}) {
  const { ocupado, ejecutar } = useEjecutar();
  const avisos = useAvisos();
  const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo ?? tipoInicial);
  const [saldoInicial, setSaldoInicial] = useState<number | null>(
    cuenta && cuenta.tipo !== "tarjeta" ? cuenta.saldoInicial : null,
  );
  // En una tarjeta se escribe lo que se debe (positivo) y se guarda como saldo negativo.
  const [deuda, setDeuda] = useState<number | null>(
    cuenta?.tipo === "tarjeta" && cuenta.saldoInicial < 0 ? -cuenta.saldoInicial : null,
  );
  const [cupo, setCupo] = useState<number | null>(cuenta?.cupo ?? null);
  const [diaPago, setDiaPago] = useState(cuenta?.diaPago ? String(cuenta.diaPago) : "");
  const [cuotasTexto, setCuotasTexto] = useState("");
  const [primeraElegida, setPrimeraElegida] = useState<"este" | "siguiente" | null>(null);
  const esTarjeta = tipo === "tarjeta";

  // Dividir la deuda en cuotas solo al crear la tarjeta (no al editarla).
  const hoy = hoyISO();
  const diaPagoNum = diaPago !== "" && Number(diaPago) >= 1 && Number(diaPago) <= 31 ? Number(diaPago) : null;
  const conCuotas = esTarjeta && !cuenta;
  const nCuotas = conCuotas ? Math.min(60, Math.max(0, Math.floor(Number(cuotasTexto)) || 0)) : 0;
  const primeraPorDefecto: "este" | "siguiente" = primeraCuotaPorDefecto(hoy, diaPagoNum) === 1 ? "siguiente" : "este";
  const primera = primeraElegida ?? primeraPorDefecto;
  const alcanza = deuda !== null && deuda >= nCuotas;
  const montos = nCuotas >= 1 && deuda && alcanza ? repartirCuotas(deuda, nCuotas) : [];
  const fechas = montos.length > 0 ? calendarioCuotas(hoy, nCuotas, diaPagoNum, primera === "siguiente" ? 1 : 0) : [];
  const conAnio = (f: string) => `${fechaCorta(f)} ${f.slice(0, 4)}`;
  const resumen =
    montos.length > 0
      ? `${nCuotas} ${nCuotas === 1 ? "cuota" : "cuotas"}${
          nCuotas > 1
            ? montos[0] === montos[1]
              ? ` iguales de ${pesos(montos[1])}`
              : `: la primera de ${pesos(montos[0])} y ${nCuotas - 1} de ${pesos(montos[1])}`
            : ` de ${pesos(montos[0])}`
        }. ${diaPagoNum !== null ? `Pagas el día ${diaPagoNum} de cada mes` : "Una por mes"}: de ${conAnio(fechas[0])} a ${conAnio(fechas[fechas.length - 1])}. Cada cuota sale de lo libre (tu sueldo) del mes en que cae.`
      : null;

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (esTarjeta && diaPagoNum === null) {
      return void avisos.error("Escribe el día del mes (1 a 31) en que pagas la tarjeta.");
    }
    if (conCuotas && nCuotas >= 1) {
      if (!deuda) return void avisos.error("Escribe lo que debes para poder dividirlo en cuotas.");
      if (!alcanza) return void avisos.error("Lo que debes tiene que alcanzar para al menos $1 por cuota.");
    }
    const conDeuda = conCuotas && nCuotas >= 1 && Boolean(deuda);
    const ok = await ejecutar(
      "cuenta",
      () =>
        peticion(cuenta ? `/api/cuentas/${cuenta.id}` : "/api/cuentas", {
          method: cuenta ? "PATCH" : "POST",
          body: JSON.stringify({
            nombre,
            tipo,
            saldoInicial: esTarjeta ? -(deuda ?? 0) : (saldoInicial ?? 0),
            cupo: esTarjeta ? cupo : null,
            diaPago: esTarjeta ? diaPagoNum : null,
            ...(conDeuda ? { deudaCuotas: nCuotas, primeraCuota: primera } : {}),
          }),
        }),
      cuenta
        ? "Cuenta actualizada."
        : conDeuda
          ? `Tarjeta creada: tu deuda quedó dividida en ${nCuotas} ${nCuotas === 1 ? "cuota" : "cuotas"}.`
          : "Cuenta creada.",
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
      <Segmentado etiqueta="Tipo" opciones={OPCIONES_TIPO} valor={tipo} onCambio={setTipo} />
      <AlturaSuave>
      {esTarjeta ? (
        <motion.div
          key="tarjeta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          <CampoDinero
            etiqueta="Cupo de la tarjeta (opcional)"
            valor={cupo}
            onCambio={setCupo}
            ayuda="Con él la app te dice cuánto te queda disponible."
          />
          <Campo
            etiqueta="Día en que pagas la tarjeta"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={diaPago}
            onChange={(e) => setDiaPago(e.target.value)}
            placeholder="Ej. 15"
            required
            ayuda="Obligatorio. Cada compra se descuenta de lo libre del mes en que pagas la tarjeta: si ese día ya pasó, de la del mes siguiente."
          />
          {cuenta?.tipo === "tarjeta" && (
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-borde-suave bg-fondo-alto p-3 text-[13px]">
              <div>
                <dt className="text-tinta-3">Debes ahora</dt>
                <dd className="mt-0.5 text-[15px] font-semibold tabular text-tinta">
                  {cuenta.saldo < 0 ? pesos(-cuenta.saldo) : pesos(0)}
                </dd>
              </div>
              <div>
                <dt className="text-tinta-3">Disponible</dt>
                <dd className="mt-0.5 text-[15px] font-semibold tabular text-tinta">
                  {cupo ? pesos(Math.max(0, cupo + cuenta.saldo)) : "Sin cupo definido"}
                </dd>
              </div>
            </dl>
          )}
          <CampoDinero
            etiqueta={cuenta ? "Deuda anterior a la app (opcional)" : "Lo que ya debes hoy (opcional)"}
            valor={deuda}
            onCambio={setDeuda}
            ayuda={
              conCuotas
                ? "Lo que debes ahora en la tarjeta. Abajo puedes dividirlo en cuotas."
                : cuenta
                  ? "Lo que ya debías antes de empezar a registrar en la app. Las compras que registraste se suman aparte, en lo que debes ahora."
                  : "Saldo pendiente antes de empezar a registrar en la app."
            }
          />

          {conCuotas && (
            <div className="flex flex-col gap-3 rounded-xl border border-borde-suave bg-fondo-alto p-3">
              <Campo
                etiqueta="¿En cuántas cuotas lo pagas? (meses)"
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={cuotasTexto}
                onChange={(e) => setCuotasTexto(e.target.value)}
                placeholder="Ej. 6"
                ayuda={
                  resumen ??
                  (nCuotas >= 1 && !deuda
                    ? "Escribe arriba lo que debes para dividirlo en partes iguales."
                    : "Déjalo vacío si no quieres dividirlo ahora: queda como saldo pendiente.")
                }
              />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Cuotas frecuentes">
                {CUOTAS_FRECUENTES.map((n) => (
                  <Boton
                    key={n}
                    type="button"
                    tamano="sm"
                    variante={nCuotas === n ? "secundario" : "fantasma"}
                    onClick={() => setCuotasTexto(String(n))}
                  >
                    {n} meses
                  </Boton>
                ))}
              </div>
              {nCuotas >= 1 && (
                <Segmentado<"este" | "siguiente">
                  etiqueta="Primera cuota"
                  columnas="grid-cols-2"
                  valor={primera}
                  onCambio={setPrimeraElegida}
                  opciones={[
                    { valor: "este", etiqueta: "Este mes" },
                    { valor: "siguiente", etiqueta: "El mes siguiente" },
                  ]}
                />
              )}
              {fechas.length > 0 && (
                <details className="text-[13px] text-tinta-2">
                  <summary className="cursor-pointer text-tinta">Ver cuándo paga cada cuota</summary>
                  <ol className="mt-2 flex flex-col gap-1">
                    {fechas.map((f, i) => (
                      <li key={f} className="flex justify-between gap-3 tabular">
                        <span>
                          {i + 1}. {conAnio(f)}
                        </span>
                        <span>{pesos(montos[i])}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div key="saldo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <CampoDinero
            etiqueta="Saldo inicial"
            valor={saldoInicial}
            onCambio={setSaldoInicial}
            ayuda="Lo que tenía la cuenta antes de empezar a registrar en la app."
          />
        </motion.div>
      )}
      </AlturaSuave>
      <Boton type="submit" cargando={ocupado === "cuenta"} className="self-end">
        {cuenta ? "Guardar cambios" : "Crear cuenta"}
      </Boton>
    </form>
  );
}

/**
 * Botón (ícono) para eliminar una tarjeta de crédito con su confirmación. Borra
 * la tarjeta y sus compras en cuotas; lo que ya pagaste desde tu banco se conserva.
 */
export function BotonEliminarTarjeta({ cuenta, className = "" }: { cuenta: CuentaConSaldo; className?: string }) {
  const { ejecutar } = useEjecutar();
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={`Eliminar la tarjeta ${cuenta.nombre}`}
        title="Eliminar tarjeta"
        onClick={() => setAbierto(true)}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
      <Confirmar
        abierto={abierto}
        titulo={`¿Eliminar la tarjeta ${cuenta.nombre}?`}
        descripcion="Se borra la tarjeta con todas sus compras y cuotas, y esas cuotas dejan de descontarse de lo libre de cada mes. Los pagos que hiciste desde tu banco se conservan. No se puede deshacer."
        accion="Eliminar tarjeta"
        onConfirmar={async () => {
          await ejecutar(
            `eliminar-${cuenta.id}`,
            () => peticion(`/api/cuentas/${cuenta.id}`, { method: "DELETE" }),
            `Tarjeta ${cuenta.nombre} eliminada.`,
          );
        }}
        onCerrar={() => setAbierto(false)}
      />
    </>
  );
}

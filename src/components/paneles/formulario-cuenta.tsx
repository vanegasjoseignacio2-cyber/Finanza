"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAvisos } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Confirmar } from "@/components/ui/confirmar";
import { Segmentado } from "@/components/ui/segmentado";
import { peticion } from "@/lib/cliente";
import { pesos } from "@/lib/dinero";
import { fechaCorta, hoyISO } from "@/lib/fechas";
import { calendarioCuotas, repartirCuotas } from "@/lib/finanzas";
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
  const primeraPorDefecto: "este" | "siguiente" =
    diaPagoNum !== null && diaPagoNum < Number(hoy.slice(8, 10)) ? "siguiente" : "este";
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
            diaPago: esTarjeta && diaPago !== "" ? Number(diaPago) : null,
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
      <Segmentado etiqueta="Tipo" opciones={TIPOS_CUENTA} valor={tipo} onCambio={setTipo} columnas="grid-cols-2" />
      {esTarjeta ? (
        <>
          <CampoDinero
            etiqueta="Cupo de la tarjeta (opcional)"
            valor={cupo}
            onCambio={setCupo}
            ayuda="Con él la app te dice cuánto te queda disponible."
          />
          <Campo
            etiqueta="Día en que pagas la tarjeta (opcional)"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={diaPago}
            onChange={(e) => setDiaPago(e.target.value)}
            placeholder="Ej. 15"
            ayuda="Cada cuota de tus compras caerá ese día del mes."
          />
          <CampoDinero
            etiqueta="Lo que ya debes hoy (opcional)"
            valor={deuda}
            onCambio={setDeuda}
            ayuda={
              conCuotas
                ? "Lo que debes ahora en la tarjeta. Abajo puedes dividirlo en cuotas."
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
        </>
      ) : (
        <CampoDinero
          etiqueta="Saldo inicial"
          valor={saldoInicial}
          onCambio={setSaldoInicial}
          ayuda="Lo que tenía la cuenta antes de empezar a registrar en la app."
        />
      )}
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

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAvisos } from "@/components/ui/avisos";
import { Boton } from "@/components/ui/boton";
import { Campo } from "@/components/ui/campo";
import { CampoDinero } from "@/components/ui/campo-dinero";
import { Segmentado } from "@/components/ui/segmentado";
import { peticion } from "@/lib/cliente";
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
  const esTarjeta = tipo === "tarjeta";

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
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
          }),
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
            ayuda="Saldo pendiente antes de empezar a registrar en la app."
          />
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

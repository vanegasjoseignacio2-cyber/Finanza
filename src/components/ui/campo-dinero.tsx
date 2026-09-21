"use client";

import { useId } from "react";

/**
 * Entrada de dinero: muestra separadores de miles mientras se escribe y
 * entrega un número limpio. Teclado numérico en móvil.
 */
export function CampoDinero({
  etiqueta,
  valor,
  onCambio,
  ayuda,
  error,
  requerido = false,
  autoFocus = false,
}: {
  etiqueta: string;
  valor: number | null;
  onCambio: (valor: number | null) => void;
  ayuda?: string;
  error?: string;
  requerido?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const mostrado = valor === null ? "" : valor.toLocaleString("es-CO");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-tinta-2">
        {etiqueta}
        {requerido && (
          <span className="ml-1 text-verde" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-tinta-3"
          aria-hidden="true"
        >
          $
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          required={requerido}
          value={mostrado}
          aria-describedby={[idError, idAyuda].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            const soloDigitos = e.target.value.replace(/\D/g, "").slice(0, 12);
            onCambio(soloDigitos === "" ? null : Number(soloDigitos));
          }}
          placeholder="0"
          className={`min-h-11 w-full rounded-xl border bg-fondo-alto/80 pr-3.5 pl-8 text-[15px] tabular text-tinta placeholder:text-tinta-3 transition-colors focus:border-verde focus:ring-2 focus:ring-verde/30 focus:outline-none ${
            error ? "border-alerta/60" : "border-borde"
          }`}
        />
      </div>
      {error ? (
        <p id={idError} role="alert" className="text-[12.5px] text-alerta">
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className="text-[12.5px] text-tinta-3">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

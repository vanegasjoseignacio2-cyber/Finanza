"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";

const BASE_CONTROL =
  "w-full min-h-11 rounded-xl border border-borde bg-fondo-alto/80 px-3.5 text-[15px] text-tinta placeholder:text-tinta-3 transition-colors duration-200 hover:border-borde focus:border-verde focus:outline-none focus:ring-2 focus:ring-verde/30 disabled:opacity-50";

interface Envoltura {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  obligatorio?: boolean;
  children: (id: string, descritoPor: string | undefined) => ReactNode;
}

function Envuelto({ etiqueta, ayuda, error, obligatorio, children }: Envoltura) {
  const id = useId();
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const descritoPor = [idError, idAyuda].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-tinta-2">
        {etiqueta}
        {obligatorio && (
          <span className="ml-1 text-verde" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children(id, descritoPor)}
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

interface PropsCampo extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  prefijo?: string;
}

export function Campo({ etiqueta, ayuda, error, prefijo, className = "", ...props }: PropsCampo) {
  return (
    <Envuelto etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={props.required}>
      {(id, descritoPor) => (
        <div className="relative">
          {prefijo && (
            <span
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-tinta-3"
              aria-hidden="true"
            >
              {prefijo}
            </span>
          )}
          <input
            id={id}
            aria-describedby={descritoPor}
            aria-invalid={error ? true : undefined}
            className={`${BASE_CONTROL} ${prefijo ? "pl-8" : ""} ${error ? "border-alerta/60" : ""} ${className}`}
            {...props}
          />
        </div>
      )}
    </Envuelto>
  );
}

interface PropsSelector extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  etiqueta: string;
  ayuda?: string;
  error?: string;
}

export function Selector({ etiqueta, ayuda, error, className = "", children, ...props }: PropsSelector) {
  return (
    <Envuelto etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={props.required}>
      {(id, descritoPor) => (
        <select
          id={id}
          aria-describedby={descritoPor}
          aria-invalid={error ? true : undefined}
          className={`${BASE_CONTROL} cursor-pointer appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10 ${className}`}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%239db0ca' stroke-width='1.8'%3E%3Cpath d='M1 1.5 6 6.5l5-5'/%3E%3C/svg%3E\")",
          }}
          {...props}
        >
          {children}
        </select>
      )}
    </Envuelto>
  );
}

export function Interruptor({
  etiqueta,
  descripcion,
  activo,
  onCambio,
}: {
  etiqueta: string;
  descripcion?: string;
  activo: boolean;
  onCambio: (valor: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambio(!activo)}
      className="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-borde-suave bg-fondo-alto/60 p-3.5 text-left transition-colors hover:border-borde"
    >
      <span className="min-w-0">
        <span className="block text-[14.5px] font-medium text-tinta">{etiqueta}</span>
        {descripcion && (
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-tinta-3">
            {descripcion}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          activo ? "bg-verde" : "bg-borde"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] duration-200 ${
            activo ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

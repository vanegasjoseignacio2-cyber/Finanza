"use client";

import * as SelectPrimitivo from "@radix-ui/react-select";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  isValidElement,
  useId,
  useState,
  type InputHTMLAttributes,
  type OptionHTMLAttributes,
  type ReactNode,
} from "react";

const BASE_CONTROL =
  "w-full min-h-11 rounded-xl border border-borde bg-fondo-alto/80 px-3.5 text-[15px] text-tinta placeholder:text-tinta-3 transition-colors duration-200 hover:border-borde focus:border-acento focus:outline-none focus:ring-2 focus:ring-acento/30 disabled:opacity-50";

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
          <span className="ml-1 text-acento" aria-hidden="true">
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

interface OpcionDesplegable {
  valor: string;
  etiqueta: ReactNode;
  deshabilitada?: boolean;
}

// Radix no permite value="" en un Item (lo reserva para "sin selección"), así que las
// opciones vacías (p. ej. "Todas", "Sin cuenta específica") viajan con este valor interno.
const VACIO = "__vacio__";

interface PropsMenu {
  id: string;
  descritoPor?: string;
  error?: string;
  value: string;
  onValueChange: (valor: string) => void;
  opciones: OpcionDesplegable[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/** Menú de select con estilo propio, usado tanto por `Selector` como por `Desplegable`. */
function MenuSelect({
  id,
  descritoPor,
  error,
  value,
  onValueChange,
  opciones,
  placeholder,
  disabled,
  required,
  className = "",
}: PropsMenu) {
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => o.valor === value);

  return (
    <SelectPrimitivo.Root
      value={value === "" ? VACIO : value}
      onValueChange={(v) => onValueChange(v === VACIO ? "" : v)}
      open={abierto}
      onOpenChange={setAbierto}
      disabled={disabled}
      // El menú solo existe abierto, así que el <select> nativo de Radix no
      // tiene opciones y, con `required`, siempre quedaría inválido al guardar.
      // Solo se exige cuando de verdad no hay nada elegido.
      required={required && value === ""}
    >
      <SelectPrimitivo.Trigger
        id={id}
        aria-describedby={descritoPor}
        aria-invalid={error ? true : undefined}
        className={`${BASE_CONTROL} flex cursor-pointer items-center justify-between gap-2 ${error ? "border-alerta/60" : ""} ${className}`}
      >
        <span className="truncate">
          <SelectPrimitivo.Value placeholder={placeholder}>{actual?.etiqueta}</SelectPrimitivo.Value>
        </span>
        <SelectPrimitivo.Icon>
          <ChevronDown
            className={`size-4 shrink-0 text-tinta-3 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </SelectPrimitivo.Icon>
      </SelectPrimitivo.Trigger>
      <AnimatePresence>
        {abierto && (
          <SelectPrimitivo.Portal forceMount>
            <SelectPrimitivo.Content position="popper" sideOffset={8} className="z-50" asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-borde bg-superficie-alta shadow-2xl"
              >
                <SelectPrimitivo.Viewport className="max-h-72 p-1.5">
                  {opciones.map((o) => (
                    <SelectPrimitivo.Item
                      key={o.valor}
                      value={o.valor === "" ? VACIO : o.valor}
                      disabled={o.deshabilitada}
                      className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-[14.5px] text-tinta outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-acento/15 data-[highlighted]:text-tinta data-[state=checked]:text-acento"
                    >
                      <SelectPrimitivo.ItemText>{o.etiqueta}</SelectPrimitivo.ItemText>
                      <SelectPrimitivo.ItemIndicator>
                        <Check className="size-4 shrink-0 text-acento" aria-hidden="true" />
                      </SelectPrimitivo.ItemIndicator>
                    </SelectPrimitivo.Item>
                  ))}
                </SelectPrimitivo.Viewport>
              </motion.div>
            </SelectPrimitivo.Content>
          </SelectPrimitivo.Portal>
        )}
      </AnimatePresence>
    </SelectPrimitivo.Root>
  );
}

interface PropsSelector {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/** Select con el mismo API que un `<select>` nativo (value/onChange/children con `<option>`), pero con menú propio. */
export function Selector({ etiqueta, ayuda, error, value, onChange, children, disabled, required, className }: PropsSelector) {
  const opciones: OpcionDesplegable[] = Children.toArray(children)
    .filter(isValidElement<OptionHTMLAttributes<HTMLOptionElement>>)
    .map((opt) => ({
      valor: String(opt.props.value ?? ""),
      etiqueta: opt.props.children,
      deshabilitada: opt.props.disabled,
    }));

  return (
    <Envuelto etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={required}>
      {(id, descritoPor) => (
        <MenuSelect
          id={id}
          descritoPor={descritoPor}
          error={error}
          value={value}
          onValueChange={(v) => onChange({ target: { value: v } })}
          opciones={opciones}
          disabled={disabled}
          required={required}
          className={className}
        />
      )}
    </Envuelto>
  );
}

interface PropsDesplegable {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  value: string;
  onChange: (valor: string) => void;
  opciones: { valor: string; etiqueta: string }[];
  placeholder?: string;
}

/** Select con opciones como datos en vez de `<option>` (más cómodo cuando ya tienes un array). */
export function Desplegable({ etiqueta, ayuda, error, value, onChange, opciones, placeholder }: PropsDesplegable) {
  return (
    <Envuelto etiqueta={etiqueta} ayuda={ayuda} error={error}>
      {(id, descritoPor) => (
        <MenuSelect
          id={id}
          descritoPor={descritoPor}
          error={error}
          value={value}
          onValueChange={onChange}
          opciones={opciones}
          placeholder={placeholder}
        />
      )}
    </Envuelto>
  );
}

/**
 * El dibujo del interruptor (estilos en globals.css, `.interruptor`). Es solo
 * visual: el control accesible es el botón con role="switch" que lo envuelve.
 */
export function Switch({ activo }: { activo: boolean }) {
  return <span aria-hidden="true" data-activo={activo} className="interruptor" />;
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
      <Switch activo={activo} />
    </button>
  );
}

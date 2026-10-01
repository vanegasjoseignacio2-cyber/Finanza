"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { FormularioMovimiento } from "@/components/captura";
import { Cabecera } from "@/components/ui/cabecera";
import type { TipoMovimiento } from "@/lib/types";

const sinSuscripcion = () => () => {};

/**
 * Verdadero solo en el navegador, y solo después de hidratar. El formulario
 * arranca con la última elección guardada en localStorage, que el servidor no
 * conoce: si se pintara ya en el primer render, el HTML del servidor y el del
 * cliente no coincidirían (error de hidratación de React).
 */
function useEnNavegador(): boolean {
  return useSyncExternalStore(sinSuscripcion, () => true, () => false);
}

export function PantallaCaptura({ tipo }: { tipo?: TipoMovimiento }) {
  const router = useRouter();
  const enNavegador = useEnNavegador();
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Cabecera titulo="Nuevo movimiento" subtitulo="Al guardar vuelves a Hoy con las cifras ya recalculadas." />
      <section className="tarjeta min-h-72 p-5 sm:p-6">
        {enNavegador && (
          <FormularioMovimiento
            borrador={tipo ? { tipo } : {}}
            onListo={() => {
              router.replace("/");
              router.refresh();
            }}
          />
        )}
      </section>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FormularioMovimiento } from "@/components/captura";
import { Cabecera } from "@/components/ui/cabecera";
import type { TipoMovimiento } from "@/lib/types";

export function PantallaCaptura({ tipo }: { tipo?: TipoMovimiento }) {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Cabecera titulo="Nuevo movimiento" subtitulo="Al guardar vuelves a Hoy con las cifras ya recalculadas." />
      <section className="tarjeta p-5 sm:p-6">
        <FormularioMovimiento
          borrador={tipo ? { tipo } : {}}
          onListo={() => {
            router.replace("/");
            router.refresh();
          }}
        />
      </section>
    </div>
  );
}

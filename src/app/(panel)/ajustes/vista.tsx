"use client";

import { Cabecera } from "@/components/ui/cabecera";
import type { Categoria } from "@/lib/categorias";
import type { DiagnosticoCorreo } from "@/lib/email/estado";
import type { Ajustes, CuentaConSaldo, Envio } from "@/lib/types";
import {
  SeccionCategorias,
  SeccionCorreo,
  SeccionCuentas,
  SeccionDatos,
  SeccionSeguridad,
  SeccionSueldo,
} from "./secciones";

export function VistaAjustes({
  ajustes,
  cuentas,
  categorias,
  envios,
  diagnostico,
}: {
  ajustes: Ajustes;
  cuentas: CuentaConSaldo[];
  categorias: Categoria[];
  envios: Envio[];
  diagnostico: DiagnosticoCorreo;
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Cabecera titulo="Ajustes" subtitulo="Sueldo, cuentas, categorías, el correo diario y tu seguridad." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SeccionSueldo sueldos={ajustes.sueldos} />
        <SeccionCuentas cuentas={cuentas} />
      </div>
      <SeccionCorreo ajustes={ajustes} envios={envios} diagnostico={diagnostico} />
      <SeccionCategorias categorias={categorias} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SeccionSeguridad />
        <SeccionDatos />
      </div>
    </div>
  );
}

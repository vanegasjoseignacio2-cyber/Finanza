import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { Alerta } from "@/lib/types";

const ESTILO = {
  riesgo: { Icono: CircleAlert, clase: "text-alerta", borde: "border-l-alerta", nombre: "Urgente" },
  aviso: { Icono: TriangleAlert, clase: "text-aviso", borde: "border-l-aviso", nombre: "Atención" },
  info: { Icono: Info, clase: "text-azul", borde: "border-l-azul", nombre: "Para saber" },
} as const;

export function ListaAlertas({ alertas }: { alertas: Alerta[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {alertas.map((a, i) => {
        const e = ESTILO[a.tono];
        return (
          <li
            key={`${a.clave}-${i}`}
            className={`flex gap-3 rounded-r-xl border-l-2 bg-fondo-alto px-3.5 py-3 ${e.borde}`}
          >
            <e.Icono className={`mt-0.5 size-4 shrink-0 ${e.clase}`} aria-hidden="true" />
            <p className="text-[13.5px] leading-relaxed text-tinta-2">
              <span className="sr-only">{e.nombre}: </span>
              {a.texto}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

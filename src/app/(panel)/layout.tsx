import { redirect } from "next/navigation";
import { ProveedorCaptura } from "@/components/captura";
import { ProveedorDatos } from "@/components/datos-panel";
import { BarraInferiorMovil, BarraLateral, BarraSuperiorMovil } from "@/components/navegacion";
import { ProveedorAvisos } from "@/components/ui/avisos";
import {
  listarCategoriasPersonales,
  listarCuentas,
  listarMetas,
  listarMovimientos,
  listarRecordatorios,
} from "@/lib/datos";
import { hoyISO } from "@/lib/fechas";
import { calcularRecordatorios } from "@/lib/finanzas";
import { sesionVigente } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

export default async function LayoutPanel({ children }: LayoutProps<"/">) {
  // El proxy solo verifica la firma; aquí se comprueba además que la sesión no
  // haya sido revocada (cambio de clave o "cerrar todas las sesiones").
  if (!(await sesionVigente())) redirect("/login");

  const hoy = hoyISO();
  const [personales, cuentas, metas, recordatorios, movimientosMes] = await Promise.all([
    listarCategoriasPersonales(),
    listarCuentas(),
    listarMetas(),
    listarRecordatorios(),
    listarMovimientos({ mes: hoy.slice(0, 7) }),
  ]);

  return (
    <ProveedorAvisos>
      <ProveedorDatos
        datos={{
          hoy,
          personales,
          cuentas,
          metas,
          pendientes: calcularRecordatorios(recordatorios, movimientosMes, hoy),
        }}
      >
        <ProveedorCaptura>
          <a
            href="#contenido"
            className="sr-only z-50 rounded-lg bg-verde px-4 text-[#04121c] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:flex focus:min-h-11 focus:items-center"
          >
            Saltar al contenido
          </a>
          <BarraLateral />
          <BarraSuperiorMovil />
          <div className="lg:pl-64">
            <main
              id="contenido"
              className="mx-auto w-full max-w-6xl px-4 pt-5 pb-32 sm:px-6 lg:px-8 lg:pt-10 lg:pb-12"
            >
              {children}
            </main>
          </div>
          <BarraInferiorMovil />
        </ProveedorCaptura>
      </ProveedorDatos>
    </ProveedorAvisos>
  );
}

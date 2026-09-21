import {
  BarraInferiorMovil,
  BarraLateral,
  BarraSuperiorMovil,
} from "@/components/navegacion";
import { ProveedorAvisos } from "@/components/ui/avisos";

export default function LayoutPanel({ children }: LayoutProps<"/">) {
  return (
    <ProveedorAvisos>
      <BarraLateral />
      <BarraSuperiorMovil />
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-10 lg:pb-12">
          {children}
        </main>
      </div>
      <BarraInferiorMovil />
    </ProveedorAvisos>
  );
}

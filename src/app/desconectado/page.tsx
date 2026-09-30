import { WifiOff } from "lucide-react";
import { Marca } from "@/components/marca";

export const metadata = { title: "Sin conexión" };

export default function Desconectado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-12 text-center">
      <Marca />
      <div>
        <WifiOff className="mx-auto size-10 text-tinta-3" aria-hidden="true" />
        <h1 className="mt-4 font-display text-xl font-semibold text-tinta">Sin conexión</h1>
        <p className="mt-2 max-w-xs text-[14px] text-tinta-3">
          Esta página necesita internet: tus cifras viven en la base de datos, no en el teléfono. Cuando
          vuelva la señal, se carga sola.
        </p>
      </div>
    </main>
  );
}

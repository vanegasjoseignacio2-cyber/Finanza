import Link from "next/link";
import { Marca } from "@/components/marca";

export default function NoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-12 text-center">
      <Marca />
      <div>
        <p className="font-display text-5xl font-semibold text-verde">404</p>
        <h1 className="mt-3 font-display text-xl font-semibold text-tinta">
          Esta página no existe
        </h1>
        <p className="mt-2 text-[14px] text-tinta-3">
          Puede que el enlace esté mal escrito o que la sección ya no esté.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-center rounded-xl degradado-marca px-5 text-[14px] font-semibold text-[#04121c] transition-[filter] hover:brightness-110"
      >
        Volver al panel
      </Link>
    </main>
  );
}

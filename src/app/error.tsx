"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fallo en la aplicación:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="tarjeta w-full max-w-md p-6 text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-alerta/12 text-alerta">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
        <h1 className="font-display text-xl font-semibold text-tinta">
          Algo se rompió por dentro
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-tinta-3">
          Casi siempre es la conexión a MongoDB: revisa que{" "}
          <code className="rounded bg-superficie-alta px-1.5 py-0.5 font-mono text-[12.5px] text-tinta-2">
            MONGODB_URI
          </code>{" "}
          esté bien y que tu IP esté permitida en Atlas.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11.5px] text-tinta-3">ref: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl degradado-marca px-5 text-[14px] font-semibold text-[#04121c] transition-[filter] hover:brightness-110"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </main>
  );
}

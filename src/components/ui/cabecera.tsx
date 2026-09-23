import type { ReactNode } from "react";

export function Cabecera({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[26px] leading-tight font-semibold text-tinta sm:text-3xl">
          {titulo}
        </h1>
        {subtitulo && <p className="mt-1 text-[14px] leading-relaxed text-tinta-3">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

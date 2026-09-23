function Bloque({ className = "" }: { className?: string }) {
  return <div className={`animate-[brillo_2.4s_ease-in-out_infinite] rounded-2xl bg-superficie ${className}`} />;
}

export default function Cargando() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5" aria-busy="true" aria-label="Cargando">
      <Bloque className="h-14 max-w-xs" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Bloque className="h-80 lg:col-span-3" />
        <Bloque className="h-80 lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Bloque className="h-48 lg:col-span-3" />
        <Bloque className="h-48 lg:col-span-2" />
      </div>
    </div>
  );
}

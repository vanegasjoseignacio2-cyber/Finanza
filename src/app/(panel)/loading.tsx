function Bloque({ className = "" }: { className?: string }) {
  return <div className={`animate-[brillo_2.4s_ease-in-out_infinite] rounded-2xl bg-superficie ${className}`} />;
}

export default function Cargando() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5" aria-busy="true" aria-label="Cargando tu panel">
      <Bloque className="h-16" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Bloque key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Bloque className="h-80" />
        <Bloque className="h-80 lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Bloque className="h-64 lg:col-span-3" />
        <Bloque className="h-64 lg:col-span-2" />
      </div>
    </div>
  );
}

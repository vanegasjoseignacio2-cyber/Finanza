export function Marca({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl degradado-marca shadow-[0_8px_20px_-10px_rgba(52,211,153,0.9)]">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          <path
            d="M4 16.5 9.5 10l4 3.2L20 6"
            stroke="#04121c"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="6" r="2.2" fill="#04121c" />
        </svg>
      </span>
      {!compacto && (
        <span className="font-display text-[17px] font-semibold tracking-tight text-tinta">
          Finanza
        </span>
      )}
    </span>
  );
}

const ANILLOS = Array.from({ length: 15 }, (_, i) => i);
const ANILLOS_APILADO = Array.from({ length: 9 }, (_, i) => i);

/**
 * El anillado: aros inclinados con la mitad trasera oscura (detrás del papel) y
 * la delantera metálica con brillo (delante), separadas en Z para que el papel
 * quede atravesado por el alambre. En el lienzo angosto hay menos aros y más
 * separados, para que no se vean amontonados.
 */
export function Anillos({ apilado }: { apilado: boolean }) {
  return (
    <div
      className="relative z-[5] flex items-end justify-center"
      style={{ gap: apilado ? 18 : 11, height: 20, transformStyle: "preserve-3d" }}
    >
      {(apilado ? ANILLOS_APILADO : ANILLOS).map((n) => (
        <div
          key={n}
          className="relative"
          style={{ width: 12, height: 30, marginBottom: -13, transform: "rotate(-7deg)", transformStyle: "preserve-3d" }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1.6px solid",
              borderColor: "#3f4348 #585d63 #1b1d20 #2a2d31",
              transform: "translateZ(-9px)",
              opacity: 0.85,
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "1.6px solid",
              borderColor: "#d7dbe0 #f2f4f6 #4e535a #7f858d",
              transform: "translateZ(9px)",
              boxShadow: "0 1px 2px rgba(0,0,0,.6)",
            }}
          />
          <div
            className="absolute rounded-sm bg-white/85"
            style={{ left: 2, top: 3, width: 2, height: 9, filter: "blur(.6px)", transform: "translateZ(10px)" }}
          />
        </div>
      ))}
    </div>
  );
}

/** Los agujeros troquelados en el borde de cada hoja, alineados con los aros. */
export function Troqueles({ apilado }: { apilado: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
      style={{ height: 14, gap: apilado ? 18 : 11 }}
    >
      {(apilado ? ANILLOS_APILADO : ANILLOS).map((n) => (
        <div
          key={n}
          style={{
            width: 12,
            height: 6,
            marginTop: 4,
            borderRadius: 4,
            background: "#000",
            boxShadow: "inset 0 1px 1px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.1)",
          }}
        />
      ))}
    </div>
  );
}

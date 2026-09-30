import { motion } from "framer-motion";

/**
 * La esquina inferior derecha doblándose antes de que la hoja despegue: es lo
 * que hace que se lea como papel y no como una plancha rígida.
 *
 * Dos triángulos que crecen desde la esquina: el hueco (la hoja de abajo que
 * queda a la vista) y la solapa (el reverso del papel levantado), un poco más
 * chica y rotada para que parezca una punta plegada. No usar dos triángulos
 * complementarios sobre la misma caja: juntos pintan un cuadrado sólido.
 */
export function EsquinaDoblada({
  activa,
  duracion,
  curva,
  adelante,
  tamano,
}: {
  activa: boolean;
  duracion: number;
  curva: [number, number, number, number];
  adelante: boolean;
  tamano: number;
}) {
  // Hacia adelante el doblez aparece al inicio del gesto; hacia atrás, al final.
  const tiempos = adelante ? [0, 0.14, 0.3, 1] : [0, 0.7, 0.86, 1];
  const alzado = adelante ? [0, 1, 0.4, 0] : [0, 0.4, 1, 0];
  const transicion = activa ? { duration: duracion, times: tiempos, ease: curva } : { duration: 0 };

  const hueco = alzado.map((k) => tamano * k);
  const solapa = alzado.map((k) => tamano * k * 0.9);
  const giro = alzado.map((k) => -14 * k);

  return (
    <div aria-hidden className="pointer-events-none absolute right-0 bottom-0 overflow-hidden" style={{ width: tamano, height: tamano }}>
      <motion.div
        animate={activa ? { width: hueco, height: hueco } : { width: 0, height: 0 }}
        transition={transicion}
        className="absolute right-0 bottom-0"
        style={{
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          background: "linear-gradient(315deg, #050505 0%, #0d0d0d 48%, #1a1a1a 100%)",
        }}
      />
      <motion.div
        animate={activa ? { width: solapa, height: solapa, rotate: giro } : { width: 0, height: 0, rotate: 0 }}
        transition={transicion}
        className="absolute right-0 bottom-0"
        style={{
          transformOrigin: "0% 0%",
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          background: "linear-gradient(315deg, #4a4a4a 0%, #333 30%, #242424 62%, #161616 100%)",
          filter: "drop-shadow(-2px -2px 5px rgba(0,0,0,.6))",
        }}
      />
    </div>
  );
}

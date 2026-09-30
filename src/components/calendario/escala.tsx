"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Escala uniformemente un contenido diseñado a ancho fijo (px) para que quepa en
 * cualquier pantalla, sin tocar sus medidas: la escena del calendario usa
 * posiciones absolutas en px (aros, hojas, celdas). Nunca agranda por encima del
 * 100% ni genera scroll.
 *
 * Hasta medir el contenedor no se muestra, para no pintar un fotograma a tamaño
 * natural desbordando la pantalla en un celular.
 */
export function Escala({ ancho, children }: { ancho: number; children: ReactNode }) {
  const exteriorRef = useRef<HTMLDivElement>(null);
  const interiorRef = useRef<HTMLDivElement>(null);
  const [anchoDisponible, setAnchoDisponible] = useState(0);
  const [altoNatural, setAltoNatural] = useState(0);

  useEffect(() => {
    const exterior = exteriorRef.current;
    if (!exterior) return;
    const medir = () => {
      const w = exterior.getBoundingClientRect().width;
      if (w > 0) setAnchoDisponible(w);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(exterior);
    return () => ro.disconnect();
  }, []);

  // offsetHeight ignora el transform: scale, así que es el alto sin escalar.
  useEffect(() => {
    const interior = interiorRef.current;
    if (!interior) return;
    const ro = new ResizeObserver(() => setAltoNatural(interior.offsetHeight));
    ro.observe(interior);
    return () => ro.disconnect();
  }, []);

  const medido = anchoDisponible > 0 && altoNatural > 0;
  const escala = medido ? Math.min(1, anchoDisponible / ancho) : 1;

  return (
    // overflow visible: el giro 3D de la hoja se proyecta un momento fuera de la
    // caja 2D, y recortarlo aquí se vería como un corte en seco.
    <div ref={exteriorRef} className="w-full">
      <div className="relative w-full" style={{ height: medido ? altoNatural * escala : undefined }}>
        <div
          ref={interiorRef}
          className="absolute top-0 left-1/2 transition-opacity duration-300"
          style={{
            width: ancho,
            transform: `translateX(-50%) scale(${escala})`,
            transformOrigin: "top center",
            opacity: medido ? 1 : 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

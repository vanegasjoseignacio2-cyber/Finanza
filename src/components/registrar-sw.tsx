"use client";

import { useEffect } from "react";

/** Registra el service worker. No renderiza nada. */
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // En desarrollo los chunks de /_next/static/ no llevan hash: el SW
    // serviría versiones viejas y rompería la evaluación de módulos.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registros) => registros.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker la app sigue funcionando normal, solo sin modo
      // offline ni instalación mejorada: no hay nada que avisarle al usuario.
    });
  }, []);

  return null;
}

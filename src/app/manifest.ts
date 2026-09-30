import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Finanza",
    short_name: "Finanza",
    description: "Lo que te queda libre este mes, tus pagos fijos y tus metas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "es-CO",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Mantener pulsado el ícono instalado lleva directo a la pantalla de captura.
    shortcuts: [
      { name: "Nuevo gasto", short_name: "Gasto", url: "/nuevo?tipo=gasto" },
      { name: "Nuevo ingreso", short_name: "Ingreso", url: "/nuevo?tipo=ingreso" },
    ],
  };
}

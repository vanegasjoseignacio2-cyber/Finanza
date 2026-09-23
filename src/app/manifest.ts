import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanza",
    short_name: "Finanza",
    description: "Cuánto puedes gastar hoy, tus pagos fijos y tus metas.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050a14",
    theme_color: "#050a14",
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

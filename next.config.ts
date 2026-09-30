import type { NextConfig } from "next";

const enProduccion = process.env.NODE_ENV === "production";

// Política de contenido sin nonces: Next inyecta scripts en línea y Framer
// Motion estilos en línea, así que 'unsafe-inline' es el mínimo que funciona.
// Las fotos de portada pueden ser enlaces https externos (img-src https:).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${enProduccion ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(enProduccion ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Sin mapas de fuente en el navegador: el código publicado no se lee en claro.
  productionBrowserSourceMaps: false,
  // Fuera todos los console.* del código propio; solo quedan los errores, que
  // en el servidor son los que muestran los registros de Vercel.
  compiler: { removeConsole: enProduccion ? { exclude: ["error"] } : false },
  async headers() {
    return [
      { source: "/:path*", headers: cabecerasSeguridad },
      // Datos privados: ninguna caché, ni la del navegador ni la de un
      // intermediario, debe guardarlos. Las portadas ya fijan su caché privada.
      {
        source: "/api/:ruta((?!portadas).*)",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
  // Los recordatorios ahora viven en Presupuesto, junto a los topes.
  async redirects() {
    return [{ source: "/recordatorios", destination: "/presupuesto#pagos-fijos", permanent: true }];
  },
};

export default nextConfig;

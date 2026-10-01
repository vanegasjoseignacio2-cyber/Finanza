import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { RegistrarSW } from "@/components/registrar-sw";
import { ProveedorTooltip } from "@/components/ui/tooltip";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Finanza",
    template: "%s · Finanza",
  },
  description: "Lo que te queda libre este mes, tus pagos fijos y tus metas, con aviso diario por correo.",
  applicationName: "Finanza",
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { capable: true, title: "Finanza", statusBarStyle: "black" },
  icons: {
    icon: [{ url: "/icono.svg", type: "image/svg+xml" }],
    apple: [{ url: "/iconos/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Sin viewport-fit=cover: Safari deja sus barras fuera de la página. Con él, la
  // barra flotante del iPhone tapaba el menú de abajo.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${sora.variable} ${inter.variable} h-full`}>
      <body className="min-h-dvh antialiased">
        <RegistrarSW />
        {/* Recorta lo que se pase del ancho dentro de este contenedor (no en
            html/body): así el documento nunca mide más que la pantalla y Safari del
            iPhone no ensancha la página ni la deja con scroll horizontal. `relative`
            hace que también recorte lo que está en posición absoluta; los elementos
            fijos (menú, barra superior) no se recortan. */}
        <div className="relative min-h-dvh overflow-x-clip">
          <ProveedorTooltip>{children}</ProveedorTooltip>
        </div>
      </body>
    </html>
  );
}

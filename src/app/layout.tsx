import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
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
  description:
    "Panel personal de gastos, ahorro y recordatorios de pago con aviso diario por correo.",
  applicationName: "Finanza",
  appleWebApp: { capable: true, title: "Finanza", statusBarStyle: "black-translucent" },
  icons: { icon: "/icono.svg" },
};

export const viewport: Viewport = {
  themeColor: "#050a14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${sora.variable} ${inter.variable} h-full`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

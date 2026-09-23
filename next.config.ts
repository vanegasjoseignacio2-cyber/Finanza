import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los recordatorios ahora viven en Presupuesto, junto a los topes.
  async redirects() {
    return [{ source: "/recordatorios", destination: "/presupuesto#pagos-fijos", permanent: true }];
  },
};

export default nextConfig;

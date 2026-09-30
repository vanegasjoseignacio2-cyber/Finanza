import type { MetadataRoute } from "next";

// Panel personal: ningún buscador debe indexar nada, ni siquiera el login.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}

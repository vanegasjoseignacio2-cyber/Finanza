import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";

const PUBLICAS = ["/login", "/api/auth/login", "/api/cron", "/desconectado"];

/** Una escritura que viene de otro sitio es un intento de CSRF. Sin cabecera Origin (cron, curl) no se opina. */
function origenAjeno(request: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return false;
  const origen = request.headers.get("origin");
  if (!origen) return false;
  try {
    return new URL(origen).host !== request.nextUrl.host;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (origenAjeno(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  if (PUBLICAS.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))) {
    return NextResponse.next();
  }

  if (await sesionValida(request.cookies.get(COOKIE_SESION)?.value)) {
    return NextResponse.next();
  }

  // Las llamadas de datos responden 401 para que el cliente muestre el error;
  // la navegación se manda al login conservando el destino.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
  }

  const destino = new URL("/login", request.url);
  if (pathname !== "/") destino.searchParams.set("volver", pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  // Recursos públicos: estáticos, íconos, el manifest y el service worker
  // (el navegador y el propio SW los piden sin sesión, incluso sin red).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icono.svg|iconos/|manifest.webmanifest|sw.js|robots.txt).*)"],
};

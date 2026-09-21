import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";

const PUBLICAS = ["/login", "/api/auth/login", "/api/cron"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icono.svg|manifest.webmanifest).*)"],
};

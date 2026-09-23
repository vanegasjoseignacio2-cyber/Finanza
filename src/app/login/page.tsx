import { redirect } from "next/navigation";
import { sesionVigente } from "@/lib/seguridad";
import { FormularioLogin } from "./formulario";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function PaginaLogin({
  searchParams,
}: PageProps<"/login">) {
  // La misma comprobación que el panel: con una sesión revocada, mirar solo la
  // firma mandaría a "/" y el panel devolvería aquí, en bucle.
  if (await sesionVigente()) redirect("/");

  const params = await searchParams;
  // Solo rutas internas: "//otro-sitio.com" también empieza por "/" y sería
  // una redirección abierta.
  const pedido = typeof params.volver === "string" ? params.volver : "/";
  const volver = /^\/(?![\/\\])/.test(pedido) ? pedido : "/";

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <FormularioLogin volver={volver} />
    </main>
  );
}

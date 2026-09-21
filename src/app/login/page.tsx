import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";
import { FormularioLogin } from "./formulario";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function PaginaLogin({
  searchParams,
}: PageProps<"/login">) {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (await sesionValida(token)) redirect("/");

  const params = await searchParams;
  const volver = typeof params.volver === "string" ? params.volver : "/";

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <FormularioLogin volver={volver} />
    </main>
  );
}

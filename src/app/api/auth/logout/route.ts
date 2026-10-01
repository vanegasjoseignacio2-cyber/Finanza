import { borrarCookieSesion } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

export async function POST() {
  await borrarCookieSesion();
  return Response.json({ ok: true });
}

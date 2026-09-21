import { cookies } from "next/headers";
import { COOKIE_SESION } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  (await cookies()).delete(COOKIE_SESION);
  return Response.json({ ok: true });
}

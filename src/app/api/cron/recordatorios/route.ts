import { ejecutarRecordatorioDiario } from "@/lib/recordatorio-diario";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint que dispara el correo diario. Lo llaman Vercel Cron, GitHub Actions
 * o cualquier servicio externo, siempre con el secreto compartido.
 */
async function manejar(request: Request): Promise<Response> {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    return Response.json(
      { error: "Falta CRON_SECRET en el servidor." },
      { status: 500 },
    );
  }

  const cabecera = request.headers.get("authorization");
  const enUrl = new URL(request.url).searchParams.get("secreto");
  const autorizado = cabecera === `Bearer ${secreto}` || enUrl === secreto;
  if (!autorizado) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const origen = new URL(request.url).origin;
  const resultado = await ejecutarRecordatorioDiario({
    urlApp: process.env.APP_URL || origen,
  });

  return Response.json(resultado, { status: resultado.error ? 502 : 200 });
}

export async function GET(request: Request) {
  return manejar(request);
}

export async function POST(request: Request) {
  return manejar(request);
}

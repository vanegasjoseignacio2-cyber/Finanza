import { exportarRespaldo } from "@/lib/datos";
import { hoyISO } from "@/lib/fechas";
import { protegido } from "@/lib/seguridad";

export const dynamic = "force-dynamic";

export const GET = protegido(async () =>
  new Response(await exportarRespaldo(), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="finanza-respaldo-${hoyISO()}.json"`,
    },
  }),
);

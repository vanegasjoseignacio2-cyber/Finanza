import { guardarAjustes, obtenerAjustes } from "@/lib/datos";
import { diagnosticoCorreo } from "@/lib/email/estado";
import { protegido } from "@/lib/seguridad";
import type { Ajustes } from "@/lib/types";
import { comoBooleano, comoEmail, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export const GET = protegido(async () =>
  Response.json({ ajustes: await obtenerAjustes(), diagnostico: diagnosticoCorreo() }),
);

export const PUT = protegido(async (request) => {
  const c = await leerJson(request);
  const cambios: Partial<Ajustes> = {};
  if (c.email !== undefined) cambios.email = comoEmail(c.email);
  if (c.emailActivo !== undefined) cambios.emailActivo = comoBooleano(c.emailActivo, true);
  if (c.enviarSiempre !== undefined) cambios.enviarSiempre = comoBooleano(c.enviarSiempre);
  if (c.respaldoSemanal !== undefined) cambios.respaldoSemanal = comoBooleano(c.respaldoSemanal, true);
  if (c.diasAviso !== undefined) {
    const dias = Number(c.diasAviso);
    cambios.diasAviso = Number.isInteger(dias) && dias >= 0 && dias <= 15 ? dias : 3;
  }
  return Response.json({ ajustes: await guardarAjustes(cambios) });
});

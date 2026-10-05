import { acreditarSueldoSiToca, guardarAjustes, obtenerAjustes } from "@/lib/datos";
import { diagnosticoCorreo } from "@/lib/email/estado";
import { protegido } from "@/lib/seguridad";
import type { Ajustes } from "@/lib/types";
import { comoBooleano, comoDia, comoEmail, comoHora, ErrorValidacion, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

export const GET = protegido(async () =>
  Response.json({ ajustes: await obtenerAjustes(), diagnostico: diagnosticoCorreo() }),
);

export const PUT = protegido(async (request) => {
  const c = await leerJson(request);
  const cambios: Partial<Ajustes> = {};
  if (c.email !== undefined) cambios.email = comoEmail(c.email);
  if (c.emailActivo !== undefined) cambios.emailActivo = comoBooleano(c.emailActivo, true);
  if (c.diaSueldo !== undefined) cambios.diaSueldo = c.diaSueldo === null || c.diaSueldo === "" ? null : comoDia(c.diaSueldo);
  if (c.respaldoSemanal !== undefined) cambios.respaldoSemanal = comoBooleano(c.respaldoSemanal, true);
  // La hora es obligatoria al guardar el correo: sin ella no se sabe cuándo avisar.
  if (c.email !== undefined && c.horaAviso === undefined) throw new ErrorValidacion("Elige la hora a la que quieres el aviso.");
  if (c.horaAviso !== undefined) cambios.horaAviso = comoHora(c.horaAviso);
  if (c.diasAviso !== undefined) {
    const dias = Number(c.diasAviso);
    cambios.diasAviso = Number.isInteger(dias) && dias >= 0 && dias <= 15 ? dias : 3;
  }
  const ajustes = await guardarAjustes(cambios);
  // Si el día ya llegó este mes, el sueldo se registra en el acto.
  const sueldo = cambios.diaSueldo ? await acreditarSueldoSiToca() : undefined;
  return Response.json({ ajustes, sueldo });
});

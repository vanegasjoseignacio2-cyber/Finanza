import { guardarAjustes, obtenerAjustes } from "@/lib/datos";
import { diagnosticoCorreo } from "@/lib/email/estado";
import {
  comoBooleano,
  comoEmail,
  comoMonto,
  comoTexto,
  leerJson,
  respuestaError,
} from "@/lib/validacion";
import { esFechaValida } from "@/lib/fechas";
import type { Ajustes } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({
      ajustes: await obtenerAjustes(),
      diagnostico: diagnosticoCorreo(),
    });
  } catch (error) {
    return respuestaError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const cuerpo = await leerJson(request);
    const cambios: Partial<Ajustes> = {};

    if (cuerpo.ingresoMensual !== undefined) {
      cambios.ingresoMensual = comoMonto(cuerpo.ingresoMensual, "ingreso mensual", true);
    }
    if (cuerpo.metaAhorro !== undefined) {
      cambios.metaAhorro = comoMonto(cuerpo.metaAhorro, "meta de ahorro", true);
    }
    if (cuerpo.metaNombre !== undefined) {
      cambios.metaNombre = comoTexto(cuerpo.metaNombre, "nombre de la meta", 60);
    }
    if (cuerpo.metaFechaLimite !== undefined) {
      cambios.metaFechaLimite = esFechaValida(cuerpo.metaFechaLimite)
        ? cuerpo.metaFechaLimite
        : null;
    }
    if (cuerpo.email !== undefined) cambios.email = comoEmail(cuerpo.email, false);
    if (cuerpo.emailActivo !== undefined) {
      cambios.emailActivo = comoBooleano(cuerpo.emailActivo, true);
    }
    if (cuerpo.enviarSiempre !== undefined) {
      cambios.enviarSiempre = comoBooleano(cuerpo.enviarSiempre, false);
    }
    if (cuerpo.diasAviso !== undefined) {
      const dias = Number(cuerpo.diasAviso);
      cambios.diasAviso = Number.isInteger(dias) && dias >= 0 && dias <= 15 ? dias : 3;
    }

    return Response.json({ ajustes: await guardarAjustes(cambios) });
  } catch (error) {
    return respuestaError(error);
  }
}

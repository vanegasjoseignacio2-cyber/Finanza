import { guardarPortada, leerImagenPortada, quitarPortada, TOTAL_FONDOS_PORTADA, type CambioPortada } from "@/lib/datos";
import { esMesValido } from "@/lib/fechas";
import { protegido } from "@/lib/seguridad";
import { ErrorNoEncontrado, ErrorValidacion, leerJson } from "@/lib/validacion";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ clave: string }> };

/** El cliente ya reduce la foto a ~1600 px; esto solo frena subidas absurdas. */
const MAX_BYTES = 3 * 1024 * 1024;

function comoClave(valor: string): string {
  if (valor === "todos" || esMesValido(valor)) return valor;
  throw new ErrorValidacion("La portada debe ser de un mes (AAAA-MM) o de todos.");
}

/** Tipo real por los primeros bytes, sin fiarse del content-type (y nunca SVG). */
function detectarMime(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  const texto = (i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
  if (texto(0, 4) === "RIFF" && texto(8, 4) === "WEBP") return "image/webp";
  return null;
}

function comoEnlace(valor: unknown): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new ErrorValidacion("Pega un enlace completo, que empiece por https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ErrorValidacion("El enlace debe empezar por https://");
  }
  if (texto.length > 2000) throw new ErrorValidacion("El enlace es demasiado largo.");
  return url.toString();
}

export const GET = protegido<Ctx>(async (_request, { params }) => {
  const imagen = await leerImagenPortada(comoClave((await params).clave));
  if (!imagen) throw new ErrorNoEncontrado("Esa portada no tiene imagen.");
  return new Response(new Uint8Array(imagen.bytes), {
    headers: {
      "content-type": imagen.mime,
      "x-content-type-options": "nosniff",
      // La URL lleva ?v=<versión>: al reemplazar la imagen cambia, así que la
      // copia guardada nunca queda vieja.
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
});

/** Fondo del catálogo, automático o enlace a una imagen. */
export const PUT = protegido<Ctx>(async (request, { params }) => {
  const clave = comoClave((await params).clave);
  const c = await leerJson(request);
  let cambio: CambioPortada;
  if (c.tipo === "auto") {
    cambio = { tipo: "auto" };
  } else if (c.tipo === "fondo") {
    const fondo = Number(c.fondo);
    if (!Number.isInteger(fondo) || fondo < 0 || fondo >= TOTAL_FONDOS_PORTADA) {
      throw new ErrorValidacion("Ese fondo no existe.");
    }
    cambio = { tipo: "fondo", fondo };
  } else if (c.tipo === "enlace") {
    cambio = { tipo: "enlace", url: comoEnlace(c.url) };
  } else {
    throw new ErrorValidacion("Tipo de portada no válido.");
  }
  return Response.json({ portadas: await guardarPortada(clave, cambio) });
});

/** Foto subida desde el equipo: el cuerpo son los bytes de la imagen. */
export const POST = protegido<Ctx>(async (request, { params }) => {
  const clave = comoClave((await params).clave);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    throw new ErrorValidacion("La imagen pesa demasiado (máximo 3 MB).");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) throw new ErrorValidacion("No llegó ninguna imagen.");
  if (bytes.length > MAX_BYTES) throw new ErrorValidacion("La imagen pesa demasiado (máximo 3 MB).");
  const mime = detectarMime(bytes);
  if (!mime) throw new ErrorValidacion("Formato no admitido. Usa JPG, PNG, WebP o GIF.");
  return Response.json({ portadas: await guardarPortada(clave, { tipo: "imagen", imagen: bytes, mime }) });
});

/** Quita la portada propia: el mes vuelve a la general o a la automática. */
export const DELETE = protegido<Ctx>(async (_request, { params }) => {
  return Response.json({ portadas: await quitarPortada(comoClave((await params).clave)) });
});

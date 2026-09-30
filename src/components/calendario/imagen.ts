/** Lado mayor con que se guarda la foto: sobra para una portada y pesa poco. */
const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

function cargar(src: string, conReferer = true): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    if (!conReferer) img.referrerPolicy = "no-referrer";
    const limite = window.setTimeout(() => rechazar(new Error("tiempo")), 15_000);
    img.onload = () => {
      window.clearTimeout(limite);
      resolver(img);
    };
    img.onerror = () => {
      window.clearTimeout(limite);
      rechazar(new Error("carga"));
    };
    img.src = src;
  });
}

/**
 * Reduce la foto elegida a JPEG de como mucho 1600 px antes de subirla: una foto
 * de celular pesa 3-12 MB y la portada no necesita tanto.
 *
 * La orientación EXIF (fotos de celular giradas) la aplica el navegador al
 * decodificar. En iPhone, el selector de fotos ya entrega JPEG aunque la foto
 * esté en HEIC; en Android una HEIC solo se lee si el navegador la soporta.
 */
export async function prepararFoto(archivo: File): Promise<Blob> {
  const pareceImagen = archivo.type.startsWith("image/") || /\.(heic|heif)$/i.test(archivo.name);
  if (!pareceImagen) throw new Error("Ese archivo no es una imagen.");

  const url = URL.createObjectURL(archivo);
  try {
    let img: HTMLImageElement;
    try {
      img = await cargar(url);
    } catch {
      throw new Error("No pudimos leer esa imagen. Prueba con una foto JPG o PNG.");
    }
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
    const alto = Math.max(1, Math.round(img.naturalHeight * escala));

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("Tu navegador no pudo procesar la imagen.");
    // JPEG no tiene transparencia: se rellena para que un PNG no quede negro.
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/jpeg", CALIDAD));
    if (!blob) throw new Error("Tu navegador no pudo procesar la imagen.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Comprueba que el enlace sea una imagen que el navegador puede mostrar. */
export async function probarEnlace(url: string): Promise<void> {
  try {
    await cargar(url, false);
  } catch {
    throw new Error(
      "Ese enlace no muestra una imagen. Usa el enlace directo a la foto (clic derecho o mantener presionado → Copiar dirección de imagen).",
    );
  }
}

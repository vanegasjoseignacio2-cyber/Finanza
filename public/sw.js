// Service worker de Finanza. Estrategia deliberadamente conservadora:
// - Nunca cachea /api/ ni /login: son datos financieros y de sesión, siempre
//   deben ir a la red. Si no hay red, que falle, no que muestre algo viejo.
// - Cachea los assets estáticos (JS/CSS/fuentes de Next, íconos) con
//   stale-while-revalidate: rápido en la segunda visita, se actualiza solo.
// - Si falla la navegación a una página por falta de red, muestra /desconectado.

const VERSION = "v1";
const CACHE_ESTATICOS = `finanza-estaticos-${VERSION}`;
const RUTA_OFFLINE = "/desconectado";

const PRECARGA = [
  RUTA_OFFLINE,
  "/icono.svg",
  "/iconos/icono-192.png",
  "/iconos/icono-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_ESTATICOS).then((cache) => cache.addAll(PRECARGA)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE_ESTATICOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function esEstaticoDeNext(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/iconos/") || url.pathname === "/icono.svg";
}

self.addEventListener("fetch", (evento) => {
  const solicitud = evento.request;
  if (solicitud.method !== "GET") return;

  const url = new URL(solicitud.url);
  if (url.origin !== self.location.origin) return;

  // Datos y sesión: siempre red, nunca caché.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/login")) return;

  // Assets con hash en el nombre: cambian de URL cuando cambia el contenido,
  // así que stale-while-revalidate es seguro y rápido.
  if (esEstaticoDeNext(url)) {
    evento.respondWith(
      caches.open(CACHE_ESTATICOS).then(async (cache) => {
        const enCache = await cache.match(solicitud);
        const enRed = fetch(solicitud)
          .then((respuesta) => {
            if (respuesta.ok) cache.put(solicitud, respuesta.clone());
            return respuesta;
          })
          .catch(() => enCache);
        return enCache ?? enRed;
      }),
    );
    return;
  }

  // Navegación entre páginas: red primero (los datos cambian todo el
  // tiempo), y si no hay red, la pantalla de "sin conexión".
  if (solicitud.mode === "navigate") {
    evento.respondWith(
      fetch(solicitud).catch(() => caches.match(RUTA_OFFLINE).then((r) => r ?? Response.error())),
    );
  }
});

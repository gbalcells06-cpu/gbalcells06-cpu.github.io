// Service worker de la PWA "Atlas Test".
//
// Dos estrategias distintas según el tipo de fichero:
// - "Esqueleto" de la app (HTML/CSS/JS/datos): red primero, caché como
//   respaldo solo si no hay conexión. Así cualquier actualización que subamos
//   llega de inmediato la próxima vez que se abra con internet, en vez de
//   quedarse atascada para siempre en lo que se cacheó la primera vez.
// - Activos estáticos que casi nunca cambian (banderas, librería d3): caché
//   primero, para ahorrar datos y que carguen al instante; se renuevan solos
//   si alguna vez cambiara el fichero, porque cada versión nueva del service
//   worker borra las cachés de versiones anteriores.
const CACHE_VERSION = "v6";
const CACHE_NAME = `atlas-test-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./mascot.js",
  "./sync.js",
  "./data/sync-config.js",
  "./continents.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./lib/d3.min.js",
  "./lib/pure-helpers.js",
  "./data/africa.js",
  "./data/america.js",
  "./data/asia.js",
  "./data/europe.js",
  "./data/oceania.js",
  "./data/facts.js",
  "./data/facts-en.js",
  "./data/facts-fr.js",
  "./data/facts-pt.js",
  "./data/facts-de.js",
  "./data/i18n.js",
  "./data/i18n-names-en.js",
  "./data/i18n-names-fr.js",
  "./data/i18n-names-pt.js",
  "./data/i18n-names-de.js",
  "./data/capital-aliases.js",
];

// Estos son los que raramente cambian una vez creados: banderas, la librería
// d3 y los propios datos de la app (mapas, nombres traducidos, curiosidades,
// grafías alternativas). Pesan varios megabytes en conjunto (los GeoJSON de
// los continentes especialmente) pero apenas cambian entre visitas, así que
// cachearlos primero evita volver a descargarlos por completo cada vez que se
// abre la app con conexión. Cuando sí cambien de verdad, basta con subir
// CACHE_VERSION para que se descarguen de nuevo. El resto (HTML/CSS/JS de la
// propia app) sigue yendo red primero, porque es lo que cambia con cada
// actualización real de la app.
function isStaticAsset(url) {
  return url.includes("/lib/flags/") || url.includes("/lib/d3.min.js") || url.includes("/data/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (isStaticAsset(req.url)) {
    // caché primero
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // red primero (con timeout corto), caché como respaldo si falla
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        });
      })
  );
});

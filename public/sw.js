/* CVAN service worker — minimal app-shell + runtime cache.
   Live data (NOAA SWPC, Open-Meteo, NASA GIBS, Lorenz tiles) goes
   network-first so we never serve stale Kp / weather. The bundled JS,
   CSS, fonts, OSM tiles, and Leaflet CDN files use cache-first so the
   shell paints fast and works briefly offline. */
const CACHE = "cvan-shell-v1";
const SHELL = [
  "/cvan/",
  "/cvan/index.html",
  "/cvan/favicon.svg",
  "/cvan/manifest.webmanifest",
];

const LIVE_HOSTS = [
  "services.swpc.noaa.gov",
  "api.open-meteo.com",
  "gibs.earthdata.nasa.gov",
  "djlorenz.github.io",
  "nominatim.openstreetmap.org",
];
const CACHEABLE_HOSTS = [
  "tile.openstreetmap.org",
  "unpkg.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Live data: network-first with a short fallback to cache.
  if (LIVE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))) {
    e.respondWith(networkFirst(e.request));
    return;
  }
  // Big static deps (tiles, fonts, leaflet bundle): cache-first.
  if (CACHEABLE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))) {
    e.respondWith(cacheFirst(e.request));
    return;
  }
  // Same-origin shell + bundle.
  if (url.origin === location.origin) {
    e.respondWith(cacheFirst(e.request));
  }
});

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch {
    return hit ?? Response.error();
  }
}
async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch {
    const hit = await c.match(req);
    return hit ?? Response.error();
  }
}

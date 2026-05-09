/* CVAN service worker.
   - The HTML shell uses NETWORK-FIRST so new deploys are picked up
     the next time you're online (the previous v1 was cache-first on
     the shell, which trapped users on stale builds — fixed in v2).
   - /assets/* are Vite's hashed bundle filenames; they're immutable
     so we cache them forever (cache-first).
   - Live data (NOAA SWPC, Open-Meteo, NASA GIBS, Lorenz tiles, GIBS
     image tiles, Nominatim) is network-first, fall back to cache only
     if offline — we never want to serve a stale Kp / weather reading.
   - Big static deps from CDNs (OSM tiles, leaflet, fonts) cache-first. */
const CACHE = "cvan-shell-v2";
const SHELL = [
  "/cvan/favicon.svg",
  "/cvan/manifest.webmanifest",
  "/cvan/icon-192.png",
  "/cvan/icon-512.png",
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
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
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

  // Live data: network-first.
  if (LIVE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))) {
    e.respondWith(networkFirst(e.request));
    return;
  }
  // Big static CDN deps: cache-first.
  if (CACHEABLE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h))) {
    e.respondWith(cacheFirst(e.request));
    return;
  }
  // Same-origin: hashed assets are immutable, everything else
  // (notably index.html) must come from the network so new deploys
  // are picked up on the next refresh.
  if (url.origin === location.origin) {
    if (url.pathname.includes("/assets/")) {
      e.respondWith(cacheFirst(e.request));
    } else {
      e.respondWith(networkFirst(e.request));
    }
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

/* WorkPilot PWA — cache shell for offline reopen (network-first for app pages). */
const CACHE = "workpilot-shell-v1";
const PRECACHE = ["/", "/login", "/icons/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache auth / API / uploads
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.includes("sign-in") ||
    url.pathname.includes("sign-out")
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && (req.destination === "document" || req.destination === "style" || req.destination === "script" || req.destination === "image")) {
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/login")))
  );
});

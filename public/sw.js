// NeedleDrop service worker — deliberately tiny.
// It caches exactly one file (the offline page) and only steps in when a
// page navigation fails. It never caches HTML, API or Clerk responses, and
// never precaches app assets: a stale auth cache is worse than no offline.
// Bump CACHE_VERSION to replace the cached offline page.
const CACHE_VERSION = "v1";
const CACHE_NAME = `nd-offline-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("nd-offline-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only page navigations. Everything else (API, Clerk, assets) goes
  // straight to the network untouched.
  if (request.mode !== "navigate" || request.method !== "GET") return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached || Response.error())
    )
  );
});

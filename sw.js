/* CHS Moro / EduBridge offline app-shell cache.
   This caches the portal shell and same-origin static assets.
   Supabase/live records still require internet unless separately saved locally. */
const CACHE_NAME = "chs-moro-offline-v2";
const APP_SHELL = ["./", "./index.html", "./school-map-data.js"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map(async path => {
      const response = await fetch(path, { cache: "reload" });
      if (response.ok || response.type === "opaque") {
        await cache.put(path, response);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith("chs-moro-offline-") && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response && response.ok) {
          await cache.put("./index.html", response.clone());
        }
        return response;
      } catch (error) {
        return (await cache.match(request)) ||
               (await cache.match("./index.html")) ||
               new Response("EduBridge is offline. Open the portal once while connected to the internet.", {
                 status: 503,
                 headers: { "Content-Type": "text/plain; charset=utf-8" }
               });
      }
    })());
    return;
  }

  if (["script", "style", "image", "font", "worker"].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const networkFetch = fetch(request, { cache: "no-store" }).then(response => {
        if (response && (response.ok || response.type === "opaque")) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached);
      return networkFetch || cached;
    })());
  }
});

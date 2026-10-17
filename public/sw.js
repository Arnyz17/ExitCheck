// Minimal service worker: makes the app installable and shows the last screen if the network drops.
const CACHE = "exitcheck-shell-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/exit", "/manifest.json", "/icon-192.png"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).pathname.startsWith("/api/")) return;
  e.respondWith(fetch(req).then((res) => {
    if (req.mode === "navigate") caches.open(CACHE).then((c) => c.put(req, res.clone()));
    return res;
  }).catch(() => caches.match(req).then((m) => m || caches.match("/exit"))));
});

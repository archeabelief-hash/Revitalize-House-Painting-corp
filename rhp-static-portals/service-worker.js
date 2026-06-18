const CACHE = "rhp-portal-shell-v1";
const SHELL = [
  "./customer.html",
  "./client.html",
  "./sales-agent.html",
  "./styles.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes("workers.dev")) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

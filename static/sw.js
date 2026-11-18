// static/sw.js
// Service Worker for EMP-V2 Progressive Web App.
// Enables "Add to Home Screen" installability and caches core offline assets.

const CACHE_NAME = "emp-v2-cache-v1";
const STATIC_ASSETS = [
    "/",
    "/static/css/style.css",
    "/static/vendor/bootstrap.min.css",
    "/static/vendor/bootstrap.bundle.min.js",
    "/static/vendor/vue.global.prod.js",
    "/static/vendor/vue-router.global.prod.js",
    "/static/vendor/chart.umd.min.js",
    "/static/manifest.json"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Only cache GET requests, bypass API calls to ensure live transactional data
    if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

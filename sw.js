/* Sandıklı Portal — Service Worker
   Cache-first: core HTML/CSS/JS önceden kaydedilir, görseller istek anında önbelleğe alınır.
   Değişiklikte PRECACHE_VERSION artır → eski önbellek temizlenir, site yenilenir. */
const PRECACHE_VERSION = "sandikli-v18";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./tarih.html",
  "./termal.html",
  "./kesfet.html",
  "./ekonomi.html",
  "./lezzet.html",
  "./galeri.html",
  "./geleneklerimiz.html",
  "./nobetci-eczaneler.html",
  "./cenaze-ilanlari.html",
  "./ulasim.html",
  "./belgeler-ile-sandikli.html",
  "./assets/css/style.css",
  "./assets/js/main.js",
  "./assets/js/search.js",
  "./assets/css/base.css",
  "./assets/css/components.css",
  "./assets/js/navbar.js",
  "./components/navbar.html",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = PRECACHE_VERSION;
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== keep).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Sayfa istekleri: network-first, önbellek yedeği (her zaman taze içerik)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PRECACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Statik varlıklar + görseller: cache-first, arka planda tazele
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(PRECACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

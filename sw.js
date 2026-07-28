self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("exercise-cache-v1").then(cache => {
      return cache.addAll([
        "./",
        "index.html",
        "styles.css",
        "app.js",
        "firebase-config.js",
        "manifest.json"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

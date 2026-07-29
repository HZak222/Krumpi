self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("exercise-cache-v2").then(cache => {
      return cache.addAll([
        "./",
        "index.html",
        "styles.css",
        "app.js",
        "firebase-config.js",
        "manifest.json",
        "images/back-row-1.jpg",
        "images/back-row-2.jpg",
        "images/back-row-3.jpg",
        "images/back-row-4.jpg"
      ]);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== "exercise-cache-v2").map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("exercise-cache-v7").then(cache => {
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
        "images/back-row-4.jpg",
        "images/tricep-extension-1.jpg",
        "images/tricep-extension-2.jpg",
        "images/tricep-extension-3.jpg",
        "images/tricep-extension-4.jpg",
        "images/pull-apart-1.jpg",
        "images/pull-apart-2.jpg",
        "images/pull-apart-3.jpg",
        "images/pull-apart-4.jpg",
        "images/curls-1.jpg",
        "images/curls-2.jpg",
        "images/curls-3.jpg",
        "images/curls-4.jpg",
        "images/curls-5.jpg",
        "images/chest-flies-1.jpg",
        "images/chest-flies-2.jpg",
        "images/chest-flies-3.jpg",
        "images/chest-flies-ground-1.jpg",
        "images/chest-flies-ground-2.jpg",
        "images/chest-flies-ground-3.jpg"
      ]);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== "exercise-cache-v7").map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

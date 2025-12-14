const CACHE_NAME = "dhanrekha-v4";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/signup.html",
  "/dashboard.html",
  "/monthly.html",
  "/forgot-password.html",
  "/reset-password.html",

  "/css/index.css",
  "/css/glass.css",
  "/css/dashboard.css",
  "/css/monthly.css",

  "/js/api.js",
  "/js/authGuard.js",
  "/js/home.js",
  "/js/auth.js",
  "/js/signup.js",
  "/js/dashboard.js",
  "/js/monthly.js",

  "/assets/logo1.png",
  "/assets/banner.png"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
});

// FETCH
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});

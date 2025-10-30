// Enhanced service worker for Android PWA
const CACHE_NAME = "pipboy-v2";
const STATIC_CACHE = "pipboy-static-v2";
const DYNAMIC_CACHE = "pipboy-dynamic-v2";

const urlsToCache = [
  "./",
  "./index.html",
  "./bundle.js",
  "./manifest.json",
  "https://fonts.googleapis.com/css?family=Inconsolata:400,700",
];

// Install event - cache static assets
self.addEventListener("install", function (event) {
  console.log("SW: Installing...");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(function (cache) {
        console.log("SW: Caching static assets");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force activation
  );
});

// Activate event - clean old caches
self.addEventListener("activate", function (event) {
  console.log("SW: Activating...");
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("SW: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - network first with fallback strategy
self.addEventListener("fetch", function (event) {
  const requestUrl = new URL(event.request.url);

  // Handle different types of requests
  if (event.request.method === "GET") {
    // API requests (weather, radio streams) - network first
    if (
      requestUrl.hostname.includes("api.") ||
      requestUrl.hostname.includes("stream.")
    ) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Cache successful API responses for short time
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback to cache if network fails
            return caches.match(event.request);
          })
      );
    }
    // Static assets - cache first
    else if (
      urlsToCache.includes(requestUrl.pathname) ||
      requestUrl.pathname.endsWith(".js") ||
      requestUrl.pathname.endsWith(".css")
    ) {
      event.respondWith(
        caches.match(event.request).then(function (response) {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
      );
    }
    // All other requests - network first with cache fallback
    else {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request);
          })
      );
    }
  }
});

// Background sync for Android
self.addEventListener("sync", function (event) {
  if (event.tag === "background-sync") {
    console.log("SW: Background sync triggered");
    event.waitUntil(
      // Perform background tasks like data synchronization
      Promise.resolve()
    );
  }
});

// Push notifications (for future features)
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "./icon-192x192.png",
      badge: "./icon-72x72.png",
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        {
          action: "open",
          title: "Open Pip-Boy",
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Pip-Boy", options)
    );
  }
});

// Notification click handling
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "open" || !event.action) {
    event.waitUntil(clients.openWindow("./"));
  }
});

// Message handling from main app
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

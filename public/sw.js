const CACHE_NAME = 'provia-employee-v3-access-fix';
const urlsToCache = [
  '/',
  '/employee',
  '/employee/interventions',
  '/employee/timesheets',
  '/employee/profile',
  '/src/index.css'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome extensions and external resources
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-timesheets') {
    event.waitUntil(syncTimesheets());
  } else if (event.tag === 'sync-photos') {
    event.waitUntil(syncPhotos());
  }
});

async function syncTimesheets() {
  // This will be called when connection is restored
  console.log('Syncing timesheets...');
  // Implementation will be added when needed
}

async function syncPhotos() {
  console.log('Syncing photos...');
  // Implementation will be added when needed
}

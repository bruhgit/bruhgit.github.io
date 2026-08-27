/**
 * Service Worker for omerdev (bruhgit.github.io)
 * Enables 100% offline support, instant caching, and PWA installation.
 */

const CACHE_NAME = 'omerdev-pwa-v1.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css?v=2.4',
    './app.js?v=2.2',
    './config.js?v=2.2',
    './site.webmanifest',
    './robots.txt',
    './humans.txt',
    './security.txt',
    './browserconfig.xml',
    'https://github.com/bruhgit.png'
];

// Install Event - Pre-cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('PWA Pre-cache item failed:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old cache versions
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Stale-while-revalidate strategy for maximum speed & offline access
self.addEventListener('fetch', event => {
    // Only handle GET requests and skip GitHub API requests from aggressive offline caching
    if (event.request.method !== 'GET' || event.request.url.includes('api.github.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // If offline and not in cache, fallback
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});

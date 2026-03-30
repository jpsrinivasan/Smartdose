// SmartDose Service Worker v4.1
// Enables offline use, caching, and app-like experience

const CACHE_NAME = 'smartdose-v4-1';
const OFFLINE_URL = '/Smartdose/';

// Files to cache for offline use
const PRECACHE_URLS = [
  '/Smartdose/',
  '/Smartdose/index.html',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@600;700&family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// ── INSTALL: Cache all required files ──
self.addEventListener('install', function(event) {
  console.log('[SW] Installing SmartDose v4.1...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Pre-caching app shell...');
      // Cache index.html first (most important)
      return cache.add('/Smartdose/index.html').catch(function(err) {
        console.log('[SW] Pre-cache error (non-fatal):', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: Clean old caches ──
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating SmartDose v4.1...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH: Serve from cache, fall back to network ──
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external API calls (weather, Supabase, Anthropic)
  if (url.hostname === 'api.open-meteo.com') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname === 'api.anthropic.com') return;
  if (url.hostname === 'usgs.gov' || url.hostname.includes('usgs.gov')) return;

  // For app shell and static assets: Cache First strategy
  if (url.hostname === location.hostname || 
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('unpkg.com')) {
    
    event.respondWith(
      caches.match(event.request).then(function(cachedResponse) {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }
        // Not in cache — fetch from network and cache it
        return fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            var responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(function() {
          // Network failed — return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/Smartdose/index.html');
          }
        });
      })
    );
    return;
  }
});

// ── BACKGROUND SYNC: Save data when back online ──
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-entries') {
    console.log('[SW] Background sync triggered');
    // Data sync handled by main app
  }
});

// ── PUSH NOTIFICATIONS (future use) ──
self.addEventListener('push', function(event) {
  if (event.data) {
    var data = event.data.json();
    self.registration.showNotification(data.title || 'SmartDose Alert', {
      body: data.body || 'Check your plant readings',
      icon: '/Smartdose/icon.png',
      badge: '/Smartdose/badge.png',
      tag: 'smartdose-alert',
      requireInteraction: true
    });
  }
});

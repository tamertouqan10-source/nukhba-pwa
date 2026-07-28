const CACHE = 'nukhba-v15';
const ASSETS = ['/', '/index.html', '/styles/main.css', '/app.js', '/supabase.js', '/manifest.json', '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png', '/favicon.ico', '/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache API calls
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// GURU POS - v4.3 AUTO-UPDATE - Final
// This version auto-kills old cache, no more manual clearing per store

const CACHE_NAME = 'guru-pos-v4-boss-3-AUTO';

const APP_SHELL = [
  './',
  './index.html',
  './license.html',
  './license.js',
  './manifest.json'
];

const OPTIONAL = [
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
];

// INSTALL - Cache new version and force immediate takeover
self.addEventListener('install', event => {
  console.log('[GURU v4.3] Installing new version');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_SHELL);
      await Promise.allSettled(OPTIONAL.map(u => cache.add(u).catch(()=>{})));
    })
  );
  self.skipWaiting(); // <- THIS auto-kills old SW, no manual clear needed
});

// ACTIVATE - Delete ALL old caches and reload all clients
self.addEventListener('activate', event => {
  console.log('[GURU v4.3] Activating, deleting old caches');
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[GURU v4.3] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
    .then(() => {
      // Force reload all open tabs to new version
      return self.clients.matchAll({type: 'window'}).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
  );
});

// FETCH - Offline first, but NEVER cache Supabase
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = req.url;

  // Don't touch Supabase or realtime - always go network
  if (url.includes('supabase.co') || url.includes('rest/v1') || url.includes('realtime')) {
    return;
  }

  if (req.method !== 'GET') return;
  if (new URL(url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(res => {
      // Cache successful same-origin responses for offline
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
      }
      return res;
    }).catch(async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html') || await caches.match('./');
        if (shell) return shell;
      }
      return Response.error();
    })
  );
});

// MESSAGE - For future sync triggers
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
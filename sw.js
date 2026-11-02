// GURU POS - v4.3 AUTO-UPDATE - Final - Bidirectional Sync Ready
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

self.addEventListener('install', event => {
  console.log('[GURU v4.3] Installing');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_SHELL);
      await Promise.allSettled(OPTIONAL.map(u => cache.add(u).catch(()=>{})));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[GURU v4.3] Activating - deleting old caches');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
    .then(() => self.clients.matchAll({type:'window'}).then(clients => {
      clients.forEach(c => c.navigate(c.url));
    }))
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = req.url;
  if (url.includes('supabase.co') || url.includes('rest/v1') || url.includes('realtime')) return;
  if (req.method !== 'GET') return;
  if (new URL(url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const cp = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, cp));
      }
      return res;
    }).catch(async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
      return Response.error();
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
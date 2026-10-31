const CACHE_NAME = 'guru-pos-v4-boss-2'; // BUMPED - forces update on all phones

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

// === INSTALL ===
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[GURU BOSS v4.2] Caching shell');
      await cache.addAll(APP_SHELL);
      await Promise.allSettled(OPTIONAL.map(u => cache.add(u).catch(()=>{})));
    })
  );
  self.skipWaiting();
});

// === ACTIVATE - Clean old caches ===
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[GURU BOSS] Deleting:', k);
          return caches.delete(k);
        })
      )
    ).then(()=> self.clients.claim())
  );
});

// === FETCH - Offline First but NEVER cache Supabase ===
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = request.url;

  // 1. Ignore non-GET
  if (request.method !== 'GET') return;

  // 2. NEVER intercept Supabase / Live Sync - must go network always
  if (url.includes('supabase.co') || url.includes('rest/v1') || url.includes('realtime')) {
    return;
  }

  // 3. Only handle same-origin (GitHub Pages)
  if (new URL(url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await caches.match('./index.html') || await caches.match('./');
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});

// === BACKGROUND SYNC - Flushes your pending sales ===
self.addEventListener('sync', event => {
  if (event.tag === 'guru-boss-sync') {
    event.waitUntil(flushPendingFromSW());
  }
});

async function flushPendingFromSW(){
  // SW cannot read localStorage, so we ask clients (your open tabs)
  const clients = await self.clients.matchAll({type: 'window'});
  for (const client of clients){
    client.postMessage({type: 'FLUSH_PENDING'});
  }
  console.log('[GURU BOSS] Asked clients to flush offline sales');
}

// === MESSAGE HANDLER ===
let currentShopId = null;

self.addEventListener('message', event => {
  const data = event.data;
  if(!data) return;

  if(data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
  if(data.type === 'SHOP_ID'){
    currentShopId = data.shopId;
    console.log('[GURU BOSS] Shop ID:', currentShopId);
  }
  if(data.type === 'TRIGGER_SYNC'){
    // Main app tells SW internet is back
    self.registration.sync.register('guru-boss-sync').catch(()=> flushPendingFromSW());
  }
});
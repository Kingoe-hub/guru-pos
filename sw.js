const CACHE_NAME = 'guru-pos-v4-boss-1'; // Changed from v3 to v4 - forces update on all 3 phones

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
]; // cached if present; missing icon won't break install

// === INSTALL - Cache Boss Version ===
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[GURU BOSS] Caching Boss v4 shell');
      await cache.addAll(APP_SHELL);
      // Cache icons but don't fail if missing
      await Promise.allSettled(OPTIONAL.map(u => cache.add(u).catch(()=>{})));
    })
  );
  self.skipWaiting(); // Activate v4 immediately on all phones
});

// === ACTIVATE - Delete old v3 cache ===
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[GURU BOSS] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim(); // Take control of all 3 phones immediately
});

// === FETCH - Offline First for Boss Version ===
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Only handle GET requests from same origin (your GitHub Pages)
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Don't cache Supabase sync calls (when you add them later) - always go network
  if (request.url.includes('supabase.co') || request.url.includes('rest/v1/')) {
    return; // Let browser handle it, don't cache
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // If fetch succeeds, cache it for offline use
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        // Offline - try cache
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // If navigating (user opens app offline), return index.html with Boss Login
        if (request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        
        // Fallback error
        return Response.error();
      })
  );
});

// === BACKGROUND SYNC FOR BOSS - 1 Boss + 2 Cashiers ===
// When cashier sells offline, this will sync when bundles come back
self.addEventListener('sync', event => {
  if (event.tag === 'guru-boss-sync') {
    event.waitUntil(
      (async () => {
        console.log('[GURU BOSS] Syncing sales for Shop:', await getShopId());
        // When you add Supabase, sync queued sales here
        // const queuedSales = JSON.parse(localStorage.getItem('guru_sync_queue') || '[]');
        // await pushToSupabase(queuedSales);
      })()
    );
  }
});

// Helper to get current Shop ID
async function getShopId(){
  // Note: Service worker can't access localStorage directly
  // We will pass shopId via postMessage from main app later
  return 'SHOP-GURU-123';
}

// === MESSAGE HANDLER - For future 3-phone live sync ===
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
  if(event.data && event.data.type === 'SHOP_ID'){
    console.log('[GURU BOSS] Shop ID set:', event.data.shopId);
  }
});
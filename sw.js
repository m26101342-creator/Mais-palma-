
const CACHE_NAME = 'mais-palma-offline-v4'; // Updated to v4 to force refresh
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// 1. Instalação: Cacheia arquivos críticos imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o SW a ativar imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando App Shell v4');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Apagando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Estratégia Híbrida
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar APIs externas que precisam de internet real
  if (url.hostname.includes('googleapis') || url.hostname.includes('generativelanguage')) {
    return;
  }

  // A. NAVEGAÇÃO (HTML)
  // Estratégia: Network First -> Fallback Cache -> Fallback Offline Page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // SE FALHAR A REDE (OFFLINE), RETORNA O INDEX.HTML DO CACHE
          // Isso é o que faz o app "abrir" offline
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // B. ARQUIVOS ESTÁTICOS (JS, CSS, IMAGENS)
  // Estratégia: Stale-While-Revalidate (Cache Rápido + Atualização em Background)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
           // Falha silenciosa se não tiver internet
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listener para forçar atualização via mensagem (usado no index.html)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

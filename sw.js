
const CACHE_NAME = 'mais-palma-offline-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// 1. Instalação: Armazena o "App Shell" (estrutura básica) imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Instalando e cacheando recursos estáticos');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Ativação: Limpa caches antigos para garantir atualização
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptação de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requisições que não sejam GET ou que sejam para APIs externas (ex: Gemini)
  if (event.request.method !== 'GET' || url.hostname.includes('googleapis') || url.hostname.includes('generativelanguage')) {
    return;
  }

  // ESTRATÉGIA 1: NAVEGAÇÃO (HTML) -> Network First, Fallback to Cache
  // Tenta pegar a versão mais nova na rede. Se falhar (offline), entrega o index.html do cache.
  // Isso garante que o app abra offline e carregue o React, que por sua vez lerá o LocalStorage.
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
          console.log('[SW] Offline: Servindo App Shell');
          return caches.match('/index.html');
        })
    );
    return;
  }

  // ESTRATÉGIA 2: RECURSOS (JS, CSS, Imagens) -> Stale-While-Revalidate
  // Entrega o cache imediatamente (rápido) e tenta atualizar em segundo plano.
  // Se não tiver no cache, busca na rede e salva.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Promessa de atualização em background
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Verifica se a resposta é válida antes de cachear
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
         // Falha silenciosa na rede (usa o que tem no cache)
      });

      // Retorna o item do cache se existir, senão espera o fetch
      return cachedResponse || fetchPromise;
    })
  );
});

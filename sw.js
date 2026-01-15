
const CACHE_NAME = 'mais-palma-pro-v5'; // Versão incrementada
const RUNTIME_CACHE = 'runtime-cache';

// Arquivos que DEVEM estar no cache imediatamente
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// 1. Instalação: Prepara o terreno
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Instalando e cacheando núcleo');
        return cache.addAll(PRECACHE_URLS);
      })
  );
});

// 2. Ativação: Limpeza pesada de versões antigas
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Removendo cache obsoleto:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estratégia de Interceptação (O Segredo do Offline)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A. Ignorar Google Analytics, Gemini AI e coisas que exigem internet pura
  if (url.hostname.includes('google') || url.hostname.includes('generativelanguage')) {
    return;
  }

  // B. Navegação (Abrir o App) -> Network First, Fallback Cache
  // Tenta abrir a página. Se falhar (offline), abre o index.html salvo.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
           return caches.open(CACHE_NAME).then(cache => {
             cache.put(event.request, response.clone());
             return response;
           });
        })
        .catch(() => {
          // O GRANDE TRUQUE: Se estiver offline, retorna o index.html
          // Isso permite que o React carregue e leia o LocalStorage
          return caches.match('/index.html');
        })
    );
    return;
  }

  // C. Arquivos JS, CSS, Imagens (Assets do Vite) -> Stale-While-Revalidate
  // Tenta servir do cache (rápido). Em paralelo, busca na rede e atualiza o cache.
  // Se não tiver no cache, busca na rede e salva para a próxima.
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Se tem no cache, retorna imediatamente
      if (cachedResponse) {
        // Atualiza o cache em background se tiver internet
        fetch(event.request).then(networkResponse => {
             if(networkResponse && networkResponse.status === 200) {
                 caches.open(RUNTIME_CACHE).then(cache => {
                     cache.put(event.request, networkResponse.clone());
                 });
             }
        }).catch(() => {}); // Ignora erros de rede em background
        return cachedResponse;
      }

      // Se não tem no cache, busca na rede e salva
      return fetch(event.request).then(response => {
        // Verifica se a resposta é válida
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(error => {
         // Se falhar tudo (offline e sem cache), não há muito o que fazer para imagens novas
         console.log('[SW] Falha ao buscar recurso:', event.request.url);
      });
    })
  );
});

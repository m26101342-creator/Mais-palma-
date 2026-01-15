
const CACHE_NAME = 'mais-palma-v6-offline-fix';
const ASSETS_CACHE = 'assets-cache-v6';

// Arquivos fundamentais que fazem o app "ligar"
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// 1. INSTALAÇÃO: Cacheia o essencial imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o SW a assumir o controle imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Instalando App Shell...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. ATIVAÇÃO: Limpa caches velhos para não dar conflito
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== ASSETS_CACHE) {
            console.log('[SW] Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Controla as páginas abertas imediatamente
  );
});

// 3. INTERCEPTAÇÃO (O Coração do Offline)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignora APIs externas pesadas ou que exigem auth online (ex: Gemini)
  if (url.hostname.includes('generativelanguage') || url.hostname.includes('googleapis')) {
    return;
  }

  // ESTRATÉGIA A: Navegação (HTML / O App em si)
  // Se o usuário pedir a página, tenta a rede. Se falhar (offline), entrega o index.html do cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkRes.clone());
            return networkRes;
          });
        })
        .catch(() => {
          // SE FALHAR A REDE: Retorna o index.html cacheado (o app carrega offline)
          return caches.match('/index.html');
        })
    );
    return;
  }

  // ESTRATÉGIA B: Arquivos Estáticos (JS, CSS, Imagens, Fontes)
  // Tenta pegar do cache primeiro (velocidade). Se não tiver, baixa e salva.
  event.respondWith(
    caches.match(request).then((cachedRes) => {
      if (cachedRes) {
        return cachedRes; // Retorna do cache instantaneamente
      }

      // Se não tem no cache, busca na rede e salva para o futuro
      return fetch(request).then((networkRes) => {
        if (!networkRes || networkRes.status !== 200 || networkRes.type !== 'basic' && networkRes.type !== 'cors') {
          return networkRes;
        }

        const responseToCache = networkRes.clone();
        caches.open(ASSETS_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkRes;
      }).catch(() => {
         // Se falhar imagem offline, poderia retornar um placeholder aqui
      });
    })
  );
});

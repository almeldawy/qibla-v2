// Service Worker pour Qibla Finder Pro
// Version 1.0.0

const CACHE_NAME = 'qibla-finder-v1.0.0';
const RUNTIME_CACHE = 'qibla-runtime-v1.0.0';

// Fichiers à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700&display=swap',
  'https://cdn-icons-png.flaticon.com/512/2823/2823023.png'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des fichiers statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Erreur installation:', err);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Supprimer les anciens caches
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map(cacheName => {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

// Stratégie de cache : Cache First avec fallback Network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes Chrome extensions et autres protocoles
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Stratégie pour les fichiers statiques
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname === '/') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stratégie pour les polices Google
  if (url.origin === 'https://fonts.googleapis.com' || 
      url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Stratégie pour les icônes CDN
  if (url.origin === 'https://cdn-icons-png.flaticon.com') {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Par défaut : Network First
  event.respondWith(networkFirst(request));
});

// Stratégie Cache First (pour les assets statiques)
async function cacheFirst(request, cacheName = CACHE_NAME) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Cache hit:', request.url);
      return cached;
    }

    console.log('[SW] Cache miss, fetching:', request.url);
    const response = await fetch(request);
    
    // Mettre en cache uniquement les réponses valides
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Erreur cache first:', error);
    
    // Fallback : retourner une page d'erreur basique si disponible
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match('/');
    return cachedResponse || new Response('Hors ligne - Ressource indisponible', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Stratégie Network First (pour les données dynamiques)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Mettre en cache les réponses valides
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Si rien en cache, retourner une réponse d'erreur
    return new Response('Hors ligne', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Gestion des messages du client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});

// Synchronisation en arrière-plan (si supporté)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-qibla-data') {
    event.waitUntil(syncQiblaData());
  }
});

async function syncQiblaData() {
  try {
    console.log('[SW] Synchronisation des données Qibla...');
    // Logique de synchronisation si nécessaire
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Erreur sync:', error);
    return Promise.reject(error);
  }
}

// Notification de mise à jour disponible
self.addEventListener('controllerchange', () => {
  console.log('[SW] Nouveau Service Worker actif');
});

console.log('[SW] Service Worker chargé');

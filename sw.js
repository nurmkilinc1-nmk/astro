// ===== SW.js — astro.takvim Service Worker =====
const CACHE_NAME = 'astro-takvim-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/gunluk.html',
  '/aylik-takvim.html',
  '/ozel-takvimler.html',
  '/danismanlik.html',
  '/hakkimda.html',
  '/bahcivanlik.html',
  '/yeni-baslangiclar.html',
  '/detoks.html',
  '/sosyal.html',
  '/seyahat.html',
  '/imza-sozlesme.html',
  '/sac-bakim.html',
  '/saglik-tedavi.html',
  '/gida-mutfak.html'
];

// ===== INSTALL =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache açıldı');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('[Service Worker] Cache hatası:', err))
  );
  self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// ===== FETCH =====
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache'de varsa onu döndür
        if (response) {
          return response;
        }
        
        // Cache'de yoksa internete git
        return fetch(event.request)
          .then(response => {
            // Sadece başarılı yanıtları cache'le
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Offline sayfası göster
            return caches.match('/offline.html');
          });
      })
  );
});

// ===== PUSH BİLDİRİM (opsiyonel) =====
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body || 'Ay durumunu kontrol edin!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'close', title: 'Kapat' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'astro.takvim', options)
  );
});

// Bildirime tıklama
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

const CACHE_NAME = 'roll-call-pwa-cache-v1.2'; // 更改版本號以更新快取
const urlsToCache = [


  './',
  './index.html',
  './manifest.json', // 建議加入
  './icons/icon-192x192.png', // 重要！
  './icons/icon-512x512.png', // 重要！
  ];

// 安裝 Service Worker 並快取核心檔案
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting(); // 強制新的 Service Worker 立即啟動
      })
  );
});

// 啟動 Service Worker 並清理舊快取
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // 讓 Service Worker 控制所有符合範圍的頁面
    })
  );
});

// 攔截網路請求並從快取提供服務 (Cache First策略)
self.addEventListener('fetch', event => {
  // 我們只處理 GET 請求，並且是針對我們自己來源的請求或特定情況
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[Service Worker] Fetching from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then(networkResponse => {
            // 如果需要，可以在這裡將新的請求快取起來，但對於此範例，我們保持簡單
            return networkResponse;
        });
      })
      .catch(error => {
        console.error('[Service Worker] Fetch error:', error);
        // 可以提供一個通用的離線頁面，如果需要的話
      })
  );
});
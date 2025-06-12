// Service Worker 版本，當您更新 PWA 檔案時，應更改此版本號以觸發更新
const CACHE_NAME = 'roll-call-localstorage-cache-v1.2'; // 您可以根據需要更新版本號
// 需要快取的檔案列表
const urlsToCache = [
  './', // 快取根目錄，通常對應 index.html
  './index.html', // 明確快取主HTML檔案
  // 如果您有其他本地的 CSS 或 JS 檔案，也應該加到這裡
  // 例如: './style.css', './app.js'
  // Tailwind CSS 是從 CDN 載入的，此基本 Service Worker 不會主動快取它。
];

// 安裝事件：在 Service Worker 安裝時觸發，快取核心檔案
self.addEventListener('install', event => {
  console.log('[Service Worker] Install event in progress.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        return self.skipWaiting(); // 強制新的 Service Worker 立即啟動
      })
      .catch(error => {
        console.error('[Service Worker] Cache addAll failed:', error);
      })
  );
});

// 啟動事件：在 Service Worker 啟動時觸發，用於清理舊快取
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate event in progress.');
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
      console.log('[Service Worker] Claiming clients for version', CACHE_NAME);
      return self.clients.claim(); // 讓 Service Worker 控制所有符合範圍的頁面
    })
  );
});

// 攔截網路請求事件：實現快取優先策略
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          // 可選：將新的請求快取起來，但要小心
          // if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          //   const responseToCache = networkResponse.clone();
          //   caches.open(CACHE_NAME).then(cache => {
          //     cache.put(event.request, responseToCache);
          //   });
          // }
          return networkResponse;
        });
      })
      .catch(error => {
        console.error('[Service Worker] Fetch error for', event.request.url, ':', error);
        // 如果需要，可以提供一個離線時的備用頁面
        // return caches.match('./offline.html');
      })
  );
});


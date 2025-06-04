const CACHE_NAME = 'roll-call-pwa-cache-v1.3'; // 當您更新 PWA 檔案時，更改此版本號
const urlsToCache = [
  './', // 快取根目錄，通常對應 index.html
  './index.html', // 明確快取主HTML檔案
  // 您可以將其他重要的靜態資源 (如 CSS, JS 檔案，如果它們不是內嵌或從CDN載入的話) 也加入到這裡
  // 例如: './style.css', './app.js'
  // 注意：Tailwind CSS 和 Firebase SDK 是從 CDN 載入的，
  // 此基本 Service Worker 不會主動快取它們。
  // 瀏覽器會根據其自身的快取策略處理 CDN 資源。
  // 如果需要更強的離線支援 CDN 資源，需要更複雜的快取策略。
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
  // 我們只處理 GET 請求
  if (event.request.method !== 'GET') {
    return;
  }

  // 對於 Firebase Firestore 的請求，總是嘗試網路優先，因為它們是動態數據
  if (event.request.url.includes('firestore.googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // 如果網路請求失敗 (例如離線)，可以考慮返回一個通用的錯誤回應或什麼都不做
        console.warn('[Service Worker] Firestore request failed, no cache fallback for dynamic data.', event.request.url);
        // return new Response(JSON.stringify({ error: "Network error" }), { headers: { 'Content-Type': 'application/json' }});
      })
    );
    return;
  }

  // 對於其他請求 (應用程式外殼)，使用 Cache First 策略
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[Service Worker] Fetching from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then(networkResponse => {
            // 可選：將新的請求快取起來，但要小心不要快取不應快取的動態內容
            // 例如，可以檢查 response.ok 和 response.type basic 來決定是否快取
            // let responseToCache = networkResponse.clone();
            // caches.open(CACHE_NAME).then(cache => {
            //   cache.put(event.request, responseToCache);
            // });
            return networkResponse;
        });
      })
      .catch(error => {
        console.error('[Service Worker] Fetch error:', error);
        // 可以提供一個通用的離線頁面，如果需要的話
        // return caches.match('./offline.html');
      })
  );
});

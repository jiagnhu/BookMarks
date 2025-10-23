// 更清晰的缓存与更新策略（离线可用 + 快速静态资源 + API 谨慎缓存）
const CACHE_VERSION = 'v3_10';
const PREFIX = 'bm-cache-';
const PRECACHE = `${PREFIX}precache-${CACHE_VERSION}`;
const RUNTIME = `${PREFIX}runtime-${CACHE_VERSION}`;

// 预缓存核心资源（可根据项目实际调整）
const ASSET_VER = '20251022';
const PRECACHE_ASSETS = [
  '/',
  '/styles.css',
  '/favicon.ico',
  '/lock.svg',
  // JS 模块
  '/js/main.js',
  '/js/skin.js',
  '/js/appearance.js',
  '/js/drawer.js',
  '/js/links.js',
  '/js/auth.js',
  '/js/bpass.js',
  '/js/headers.js',
  '/js/state.js',
  '/js/dom.js',
  // 图片（如存在）- 带版本参数避免旧缓存
  `/images/p1.jpeg?v=${ASSET_VER}`,
  `/images/p2.jpeg?v=${ASSET_VER}`,
  `/images/p3.jpeg?v=${ASSET_VER}`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k.startsWith(PREFIX) && ![PRECACHE, RUNTIME].includes(k))
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// 支持前端点击“立即更新”
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data === 'SKIP_WAITING' || (data.type && data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// 策略：
// - HTML: Network First，失败回退到预缓存的 index.html（保证离线）
// - JS/CSS: Network-First（确保尽量拿到最新，失败回退缓存）
// - 图片/字体: Stale-While-Revalidate（先本地快速返回，再后台更新）
// - API（/api/ 前缀）: 仅 GET 走 Network First，失败时可回退到缓存（短期）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // 仅处理同源请求
  if (url.origin !== self.location.origin) return;

  // HTML 文档：网络优先，离线回退
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || Response.error();
        })
    );
    return;
  }

  // API：仅 GET；网络优先，失败回退缓存（避免离线白屏）
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // JS/CSS 采用 Network-First
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 图片/字体采用 Stale-While-Revalidate
  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
            return resp;
          })
          .catch(() => cached); // 离线时仍可用缓存
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 其他 GET 请求：直接透传网络，失败尝试缓存
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

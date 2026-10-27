/* Service Worker — Living Expenses PWA
 * 每次发版必须同步修改 VERSION，否则旧缓存会盖住新代码。
 */
const VERSION = '3.2.0';

const CACHE = 'living-expenses-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './supabase.min.js',
  './chart.umd.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        // 只清理本站旧版本缓存，不要动同一 origin 下别人的缓存
        keys.filter((k) => k.startsWith('living-expenses-') && k !== CACHE)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isRateApi(hostname) {
  return hostname === 'open.er-api.com'
      || hostname === 'api.frankfurter.app'
      || hostname === 'api.exchangerate-api.com';
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    const shell = await caches.match('./index.html');
    if (shell) return shell;
    return new Response('离线', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (cached) return cached;
  const res = await network;
  return res || new Response('{}', {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Supabase 的认证与数据请求必须实时，交给浏览器直连
  if (url.hostname.endsWith('supabase.co')) return;

  if (isRateApi(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate' || req.destination === 'document') {
      event.respondWith(networkFirst(req));
      return;
    }
    event.respondWith(cacheFirst(req));
  }
});

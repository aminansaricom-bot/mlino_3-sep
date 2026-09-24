// ملینو — service worker (D-77, D-79).
// 1) Offer notifications (web push).
// 2) Local copies, so the app opens fast and works on a weak connection:
//    • hashed build files, icons, fonts and published photos: from the phone's cache (they never change);
//    • the page and the signed public files: network first, the last good copy only when offline
//      (the app still checks the signature and expiry of whatever it reads — a stale file is never shown as new);
//    • /api/ (sessions, chat, anything personal) is never cached.

var VERSION = 'v2';
var STATIC = 'mlino-static-' + VERSION;
var LIVE = 'mlino-live-' + VERSION;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (n) { return n.indexOf('mlino-') === 0 && n !== STATIC && n !== LIVE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

function cacheFirst(request) {
  return caches.open(STATIC).then(function (cache) {
    return cache.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (res) { if (res.ok) cache.put(request, res.clone()); return res; });
    });
  });
}

function networkFirst(request, fallbackKey) {
  return caches.open(LIVE).then(function (cache) {
    return fetch(request).then(function (res) {
      if (res.ok) cache.put(fallbackKey || request, res.clone());
      return res;
    }).catch(function () {
      return cache.match(fallbackKey || request).then(function (hit) { return hit || Response.error(); });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // map tiles and other hosts: the browser's own cache
  var p = url.pathname;
  if (p.indexOf('/api/') === 0 || p === '/version.json' || p === '/sw.js') return;
  if (req.mode === 'navigate') { event.respondWith(networkFirst(req, '/')); return; }
  if (/^\/(assets|icons|fonts|mlino-assets)\//.test(p) || p.indexOf('/public-export/media/') === 0) { event.respondWith(cacheFirst(req)); return; }
  if (p === '/public-export/public-business.v1.json' || p === '/public-export/public-catalog.v1.json') { event.respondWith(networkFirst(req)); return; }
});

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  var title = typeof data.title === 'string' ? data.title.slice(0, 80) : 'ملینو';
  var body = typeof data.body === 'string' ? data.body.slice(0, 160) : 'یک تخفیف تازه در نزدیکی شما';
  var url = typeof data.url === 'string' && data.url.charAt(0) === '/' ? data.url : '/';
  event.waitUntil(self.registration.showNotification(title, {
    body: body, dir: 'rtl', lang: 'fa', icon: '/icons/app-192.png', badge: '/icons/app-192.png', tag: url, data: { url: url },
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i += 1) {
      var client = list[i];
      if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) { client.navigate(url); return client.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});

// ملینو کسب‌وکار — service worker (D-79): local copies so the panel opens fast and works on a weak connection.
// • hashed build files, icons, fonts and the robot's images: from the phone's cache (they never change);
// • the page and the signed public files: network first, the last good copy only when offline;
// • /api/ (sessions, chat, plans, offers — anything personal or live) is never cached.
// The demo books themselves already live on the device (browser storage), as before.

var VERSION = 'v1';
var STATIC = 'mlino-biz-static-' + VERSION;
var LIVE = 'mlino-biz-live-' + VERSION;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (n) { return n.indexOf('mlino-biz-') === 0 && n !== STATIC && n !== LIVE; }).map(function (n) { return caches.delete(n); }));
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

function networkFirst(request, key) {
  return caches.open(LIVE).then(function (cache) {
    return fetch(request).then(function (res) { if (res.ok) cache.put(key || request, res.clone()); return res; })
      .catch(function () { return cache.match(key || request).then(function (hit) { return hit || Response.error(); }); });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var p = url.pathname;
  if (p.indexOf('/api/') === 0 || p === '/sw.js') return;
  if (req.mode === 'navigate') { event.respondWith(networkFirst(req, '/')); return; }
  if (/^\/(assets|icons|fonts|melino)\//.test(p) || p === '/logo.png' || p.indexOf('/public-export/media/') === 0) { event.respondWith(cacheFirst(req)); return; }
  if (p === '/public-export/public-business.v1.json' || p === '/public-export/public-catalog.v1.json') { event.respondWith(networkFirst(req)); return; }
});

// ملینو — فقط برای اعلان تخفیف‌های اطراف (D-77). هیچ داده‌ای cache نمی‌کند و درخواستی را رهگیری نمی‌کند.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = typeof data.title === 'string' ? data.title.slice(0, 80) : 'ملینو';
  const body = typeof data.body === 'string' ? data.body.slice(0, 160) : 'یک تخفیف تازه در نزدیکی شما';
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/';
  event.waitUntil(self.registration.showNotification(title, {
    body, dir: 'rtl', lang: 'fa', icon: '/icons/app-192.png', badge: '/icons/app-192.png', tag: url, data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) if (client.url.startsWith(self.location.origin) && 'focus' in client) { client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});

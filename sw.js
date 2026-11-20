// Service Worker: Offline-Betrieb + Auslieferung der erzeugten Kalenderdatei.
const VERSION = 'impfbuch-v2';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/app.js', 'js/data.js', 'js/rules.js', 'js/dates.js', 'js/ics.js', 'js/store.js', 'js/search.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'impfbuch-dynamic').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Von der App erzeugte Kalenderdatei
  if (url.pathname.endsWith('/impfbuch-erinnerungen.ics')) {
    e.respondWith(caches.open('impfbuch-dynamic').then((c) => c.match(req, { ignoreSearch: true })).then((r) => r || new Response('Nicht gefunden', { status: 404 })));
    return;
  }

  // Netz zuerst (damit Updates ankommen), Cache als Offline-Fallback
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('./#status'))));
});

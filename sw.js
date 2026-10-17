// Ready Check service worker: precache everything, serve cache-first.
//
// To ship an update: change any file, then bump VERSION below and deploy.
// The new worker installs in the background on the next launch and takes
// over straight away; the launch after that runs the new files.

var VERSION = '1.0.0';
var CACHE = 'readycheck-' + VERSION;

var FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/app.js',
  './js/store.js',
  './js/views.js',
  './js/flip.js',
  './js/reorder.js',
  './js/backup.js',
  './fonts/BarlowCondensed-600.woff2',
  './fonts/BarlowCondensed-700.woff2',
  './fonts/Figtree-Variable.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' skips the HTTP cache so a new VERSION never stores stale files.
      .then(function (c) { return c.addAll(FILES.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k.indexOf('readycheck-') === 0 && k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Navigations get the app shell, so the Home Screen app opens in airplane mode.
  var lookup = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(
    caches.open(CACHE)
      .then(function (c) { return c.match(lookup, { ignoreSearch: true }); })
      .then(function (hit) { return hit || fetch(req); })
  );
});

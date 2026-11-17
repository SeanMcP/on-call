// Service worker: lets On-call be installed and played offline.
//
// Network first: when online, players always get the latest files (so a new release
// needs no version bump here), and each response refreshes the offline copy.
// When offline, the copy saved from the last visit is used.

const CACHE = 'on-call';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/engine.js',
  'js/input.js',
  'js/render.js',
  'js/sprites.js',
  'js/audio.js',
  'js/pixelfont.js',
  'js/records.js',
  'icons/favicon.svg',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      // ignoreSearch so ?autostart=1 and similar links work offline too
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});

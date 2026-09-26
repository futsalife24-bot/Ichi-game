// オフラインでも あそべるように ファイルを キャッシュする
const VERSION = 'kirakira-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './vendor/three.module.js',
  './vendor/three.core.js',
  './src/main.js',
  './src/world.js',
  './src/player.js',
  './src/input.js',
  './src/audio.js',
  './src/voice.js',
  './src/ui.js',
  './src/effects.js',
  './src/animals.js',
  './src/quests.js',
  './src/props.js',
  './src/characters.js',
  './src/save.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// まず ネット（あたらしい版）、だめなら キャッシュ
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});

// オフラインでも あそべるように ファイルを キャッシュする
const VERSION = 'kirakira-v28-second-island-voice';
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
  './src/closet-preview.js',
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
  './src/profiles.js',
  './src/profile-ui.js',
  './src/observations.js',
  './src/records-ui.js',
  './src/play-settings.js',
  './src/settings-ui.js',
  './src/suggestions.js',
  './src/play-time.js',
  './src/time-ui.js',
  './src/birthday.js',
  './src/birthday-ui.js',
  './src/save-ui.js',
  './src/help.js',
  './src/adventure-state.js',
  './src/adventure.js',
  './src/forest.js',
  './src/help-state.js',
  './src/school.js',
  './src/canvas.js',
  './src/lines.js',
  './src/catalog.js',
  './src/climate.js',
  './src/critters.js',
  './src/furniture.js',
  './src/life.js',
  './src/room.js',
  './src/maker.js',
  './voice/index.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(async (c) => {
        await c.addAll(ASSETS);
        // こえの ファイルも ぜんぶ（オフラインでも しゃべれるように）
        const idx = await (await c.match('./voice/index.json')).json();
        if (idx.schemaVersion !== 2 || !idx.clips) throw new Error('Voice manifest missing');
        const files = Object.entries(idx.clips).map(([hash, clip]) => {
          if (!/^[0-9a-f]{8}$/.test(hash) || clip.file !== `gemini/${hash}.mp3`) throw new Error('Invalid voice path');
          return `./voice/${clip.file}`;
        });
        // 小さなまとまりで取得。失敗時は旧版を維持し、不完全なオフライン版に切り替えない。
        for (let i = 0; i < files.length; i += 16) await c.addAll(files.slice(i, i + 16));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kirakira-') && k !== VERSION).map((k) => caches.delete(k))))
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

/* 못박자! — 서비스 워커
 * 한 번 열어 두면 인터넷이 없어도 켜지도록 게임 파일을 기기에 저장해 둔다.
 * 내 파일은 "네트워크 먼저, 안 되면 저장해 둔 것" 순서다. 네트워크로 받을 때는 브라우저가 기억해 둔 예전 파일을 쓰지 않고
 * 서버에 새 파일이 있는지 매번 확인한다(no-cache). 그래서 온라인일 때는 항상 최신이다.
 * 파일을 고치면 CACHE 의 번호와 index.html 의 ?v= 숫자를 함께 올린다. 번호가 바뀌면 열려 있던 화면도 새 파일로 다시 연다. */
const CACHE = 'motbakja-v8';
const SHELL = [
  './', 'index.html', 'style.css', 'manifest.json',
  'js/art.js', 'js/audio.js', 'js/charts.js', 'js/game.js', 'js/game2.js', 'js/ui.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      const old = keys.filter((k) => k !== CACHE);
      return Promise.all(old.map((k) => caches.delete(k)))
        .then(() => self.clients.claim())
        // 예전 버전이 깔려 있던 기기라면, 지금 열려 있는 화면은 예전 파일로 그려진 것이다. 새 파일로 한 번 다시 연다.
        // 다시 여는 것이 끝나기를 여기서 기다리면 안 된다: 화면은 이 준비가 끝나야 열리고, 준비는 화면을 기다려서 서로 멈춘다
        .then(() => (old.length ? self.clients.matchAll({ type: 'window' }) : []))
        .then((list) => { list.forEach((c) => { if (c.navigate) c.navigate(c.url).catch(() => null); }); });
    })
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // 내 파일: 네트워크 먼저. 받았으면 저장본을 갱신하고, 못 받으면 저장본으로 답한다. (?v=8 같은 꼬리표는 떼고 저장한다)
    const key = url.origin + url.pathname;
    e.respondWith(
      fetch(req.url, { cache: 'no-cache' })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(key, copy));
          }
          return res;
        })
        .catch(() => caches.match(key).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // 글꼴: 저장해 둔 것 먼저
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
  }
});

// Service worker: permite instalar o app e usar sem internet.
// Ao alterar arquivos do site, aumente a VERSAO para os celulares baixarem a nova versão.
const VERSAO = "sistema-v1";
const ARQUIVOS = [
  "./", "./index.html", "./style.css", "./app.js", "./personagem.js", "./icones.js",
  "./sistema.js", "./backup.js", "./manifest.json", "./icone.svg", "./icone-180.png", "./icone-192.png", "./icone-512.png",
  "https://unpkg.com/three@0.147.0/build/three.min.js",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (pega atualizações); se estiver offline, usa o cache
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && (r.ok || r.type === "opaque")) {
          const copia = r.clone();
          caches.open(VERSAO).then(c => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});

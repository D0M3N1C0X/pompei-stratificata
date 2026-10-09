// Pompei Stratificata — service worker
//
// Due strategie, non una.
//
//   · ciò che CAMBIA con i contenuti — le navigazioni (index.html, dossier/),
//     i testi delle lingue, il manifest — va in rete per primo, con la cache
//     come rete di sicurezza. Chi è online vede sempre l'ultima versione; chi
//     è offline continua a vedere l'ultima che ha scaricato.
//   · le IMMAGINI (icone) escono dalla cache per prime: non cambiano quasi
//     mai e non valgono un giro di rete.
//
// Fino all'8 ottobre 2026 anche i testi delle lingue uscivano prima dalla
// cache, e il nome della cache andava cambiato a mano: era fermo al 25
// settembre, quindi chi aveva già aperto il sito in un'altra lingua riceveva
// la pagina nuova con i testi vecchi. Adesso il nome lo scrive
// scripts/publish.js a ogni pubblicazione, con un'impronta di index.html e
// delle lingue: non c'è più niente da ricordare.
const CACHE = 'dopo79-v8-82f5535a83';

const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-1024.png',
  './icon-maskable-512.png', './apple-touch-icon.png',
  './dossier/', './dossier/index.html',
  './dossier/en/', './dossier/en/index.html',
  // le lingue diverse dall'italiano sono file a parte: senza queste righe
  // l'applicazione installata ricadrebbe in italiano appena va offline
  './i18n/en.json', './i18n/fr.json', './i18n/de.json',
  './i18n/es.json', './i18n/pt.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;

  // navigazioni, lingue, manifest: prima la rete, la cache solo se la rete
  // non risponde
  const cambia = e.request.mode === 'navigate' ||
    /\.(json|webmanifest)$/.test(new URL(e.request.url).pathname);
  if(cambia){
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          // la pagina come ultima risorsa solo per le navigazioni: a chi
          // chiede una lingua l'HTML romperebbe il JSON
          .then(hit => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : hit)))
    );
    return;
  }

  // le immagini: prima la cache
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if(hit) return hit;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      });
    })
  );
});

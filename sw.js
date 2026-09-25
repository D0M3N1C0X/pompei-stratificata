// Pompei Stratificata — service worker
//
// Due strategie, non una.
//
//   · le NAVIGAZIONI (index.html, dossier/) vanno in rete per prime, con la
//     cache come rete di sicurezza. Chi è online vede sempre l'ultima versione;
//     chi è offline continua a vedere l'ultima che ha scaricato.
//   · tutto il RESTO (icone, manifest, testi) esce dalla cache per primo: non
//     cambia quasi mai e non vale un giro di rete.
//
// La versione precedente serviva anche le pagine dalla cache, e il risultato
// era che un aggiornamento non arrivava mai a chi aveva già aperto il sito.
//
// Cambiando CACHE si forza lo svuotamento: tienila allineata alla versione
// dichiarata in index.html.
const CACHE = 'dopo79-v8-2026-09-25';

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
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if(hit) return hit;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
